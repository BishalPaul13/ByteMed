const express = require('express');
const User = require('../models/User');
const LiveSession = require('../models/LiveSession');
const { recordContribution } = require('../services/reputationService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

/**
 * Get available verified doctors for live consultations
 * Only returns doctors who are actively ONLINE with an active heartbeat within 60s (Doc 1: Sec 10, Doc 3: Sec 9)
 */
router.get('/available', async (req, res) => {
  try {
    const { specialty } = req.query;
    const activeCutoff = new Date(Date.now() - 60000); // 60-second active heartbeat window

    const filter = { 
      role: 'DOCTOR', 
      status: 'VERIFIED', 
      availability: 'AVAILABLE',
      lastActiveAt: { $gte: activeCutoff }
    };

    if (specialty && specialty !== 'All') {
      filter.specialty = specialty;
    }

    const doctors = await User.find(filter)
      .select('name specialty plusRank rankNumber availability credentials totalReputationScore averageAiScore averagePatientRating liveSessionsCount contributionsCount lastActiveAt');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update doctor availability toggle
 */
router.put('/:id/availability', async (req, res) => {
  try {
    const { availability } = req.body;
    if (!['AVAILABLE', 'OFFLINE'].includes(availability)) {
      return res.status(400).json({ message: 'Invalid availability state' });
    }

    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'DOCTOR') return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.status !== 'VERIFIED') return res.status(403).json({ message: 'Doctor is not verified yet.' });

    doctor.availability = availability;
    doctor.lastActiveAt = new Date();
    await doctor.save();

    await logAudit({
      actorId: doctor._id,
      actorRole: 'DOCTOR',
      action: 'DOCTOR_AVAILABILITY_CHANGED',
      targetType: 'DOCTOR',
      targetId: doctor._id,
      details: { availability }
    });

    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Doctor active presence heartbeat (Doc 1: Sec 11, Doc 3: Sec 9)
 */
router.put('/:id/heartbeat', async (req, res) => {
  try {
    const doctor = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { lastActiveAt: new Date() } },
      { new: true }
    ).select('availability lastActiveAt');

    res.json({ ok: true, availability: doctor?.availability });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check live session status for patient while waiting for doctor to accept
 */
router.get('/session/:sessionId/status', async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.sessionId)
      .populate('doctorId', 'name specialty plusRank availability');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check timeout per Doc 1 (Sec 10, 11) - 45s connection lease
    if (session.status === 'RESERVED' && Date.now() - new Date(session.startedAt).getTime() > 45000) {
      session.status = 'TIMEOUT_EXPIRED';
      session.endedAt = new Date();
      await session.save();
      // Release doctor availability
      if (session.doctorId) {
        await User.findByIdAndUpdate(session.doctorId._id, { $set: { availability: 'AVAILABLE' } });
      }
    }

    res.json({
      status: session.status,
      roomUrl: session.roomUrl,
      doctorId: session.doctorId?._id,
      doctorName: session.doctorId?.name,
      doctorAvailability: session.doctorId?.availability
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Cancel session before acceptance (Patient cancels call)
 */
router.post('/session/:sessionId/cancel', async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.sessionId);
    if (session && ['RESERVED', 'CONNECTING'].includes(session.status)) {
      session.status = 'CANCELLED';
      session.endedAt = new Date();
      await session.save();
      await User.findByIdAndUpdate(session.doctorId, { $set: { availability: 'AVAILABLE' } });
    }
    res.json({ cancelled: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Atomic reservation lock for live consultation (Doc 1: Sec 10, Doc 3: Sec 8)
 */
router.post('/:id/book', async (req, res) => {
  try {
    const { patientId } = req.body;

    // Atomic compare-and-swap: only reserve if currently AVAILABLE
    const doctor = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'DOCTOR', availability: 'AVAILABLE' },
      { $set: { availability: 'RESERVED' } },
      { new: true }
    );

    if (!doctor) {
      return res.status(409).json({ message: 'Physician is currently reserved or unavailable. Please choose another doctor.' });
    }

    const roomUrl = `/room/${doctor._id}`;

    // Create LiveSession record in RESERVED status (calling)
    let liveSession = null;
    if (patientId) {
      liveSession = new LiveSession({
        doctorId: doctor._id,
        patientId,
        roomUrl,
        status: 'RESERVED',
        startedAt: new Date(),
        reservationExpiresAt: new Date(Date.now() + 45000)
      });
      await liveSession.save();

      // Notify doctor
      await createNotification({
        recipientId: doctor._id,
        title: '📞 Patient Connected for Live Consultation',
        message: 'A patient has engaged your live consultation room.',
        type: 'SESSION_INVITE',
        link: roomUrl
      });
    }

    await logAudit({
      actorId: patientId || doctor._id,
      actorRole: 'PATIENT',
      action: 'LIVE_SESSION_BOOKED',
      targetType: 'DOCTOR',
      targetId: doctor._id,
      details: { sessionId: liveSession?._id, roomUrl }
    });

    res.json({
      message: 'Consultation reserved successfully',
      roomUrl,
      sessionId: liveSession?._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Doctor polls for incoming live consultation requests
 */
router.get('/:id/incoming-call', async (req, res) => {
  try {
    // Check if there is an active session in RESERVED or CONNECTING status created within the last 45 seconds
    const cutoff = new Date(Date.now() - 45000);
    const session = await LiveSession.findOne({
      doctorId: req.params.id,
      status: { $in: ['RESERVED', 'CONNECTING'] },
      startedAt: { $gte: cutoff }
    }).populate('patientId', 'name email');

    if (!session) {
      // If doctor was reserved but reservation expired without active session, release availability
      const doc = await User.findById(req.params.id);
      if (doc && doc.availability === 'RESERVED') {
        const anyActive = await LiveSession.findOne({
          doctorId: req.params.id,
          status: 'IN_SESSION'
        });
        if (!anyActive) {
          doc.availability = 'AVAILABLE';
          await doc.save();
        }
      }
      return res.json({ incoming: false });
    }

    const elapsed = Date.now() - new Date(session.startedAt).getTime();
    const timeRemainingSeconds = Math.max(0, Math.round((45000 - elapsed) / 1000));

    res.json({
      incoming: true,
      session: {
        _id: session._id,
        patient: session.patientId,
        roomUrl: session.roomUrl,
        startedAt: session.startedAt,
        timeRemainingSeconds
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Doctor accepts incoming call
 */
router.post('/:id/accept-call', async (req, res) => {
  try {
    const session = await LiveSession.findOne({
      doctorId: req.params.id,
      status: { $in: ['RESERVED', 'CONNECTING'] }
    }).sort({ startedAt: -1 });

    if (!session) {
      return res.status(404).json({ message: 'No active incoming consultation found.' });
    }

    session.status = 'IN_SESSION';
    await session.save();

    await logAudit({
      actorId: req.params.id,
      actorRole: 'DOCTOR',
      action: 'LIVE_SESSION_ACCEPTED',
      targetType: 'LIVE_SESSION',
      targetId: session._id,
      details: { doctorId: req.params.id, patientId: session.patientId }
    });

    res.json({ accepted: true, roomUrl: session.roomUrl, sessionId: session._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Doctor declines incoming call
 */
router.post('/:id/decline-call', async (req, res) => {
  try {
    const session = await LiveSession.findOne({
      doctorId: req.params.id,
      status: { $in: ['RESERVED', 'CONNECTING'] }
    }).sort({ startedAt: -1 });

    if (session) {
      session.status = 'CANCELLED';
      session.endedAt = new Date();
      await session.save();
    }

    // Release doctor availability
    await User.findByIdAndUpdate(req.params.id, { $set: { availability: 'AVAILABLE' } });

    await logAudit({
      actorId: req.params.id,
      actorRole: 'DOCTOR',
      action: 'LIVE_SESSION_DECLINED',
      targetType: 'LIVE_SESSION',
      targetId: session?._id,
      details: { doctorId: req.params.id }
    });

    res.json({ declined: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * End live consultation session, release lock, record session duration and contribution
 */
router.post('/:id/end-session', async (req, res) => {
  try {
    const { durationSeconds = 120, patientId, clinicalNotes = '', prescribedRecommendations = '' } = req.body;

    // Find and update doctor state
    const doctor = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'DOCTOR' },
      { $set: { availability: 'AVAILABLE' }, $inc: { liveSessionsCount: 1 } },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Update active LiveSession record
    const session = await LiveSession.findOne({
      doctorId: doctor._id,
      status: { $in: ['RESERVED', 'IN_SESSION'] }
    }).sort({ startedAt: -1 });

    let sessionId = null;
    if (session) {
      session.status = 'COMPLETED';
      session.endedAt = new Date();
      session.durationSeconds = durationSeconds;
      if (clinicalNotes) session.clinicalNotes = clinicalNotes;
      if (prescribedRecommendations) session.prescribedRecommendations = prescribedRecommendations;
      await session.save();
      sessionId = session._id;

      // Record in Contribution Ledger
      const durationMins = Math.max(1, Math.round(durationSeconds / 60));
      await recordContribution({
        doctorId: doctor._id,
        contributionType: 'LIVE_SESSION',
        referenceId: session._id,
        aiEvaluation: null,
        feedback: null,
        durationMinutes: durationMins
      });

      // Prompt patient for post-session review
      if (session.patientId) {
        await createNotification({
          recipientId: session.patientId,
          title: '💬 Rate Your Live Consultation',
          message: `Your session with Dr. ${doctor.name} has concluded. Please provide feedback on helpfulness and communication.`,
          type: 'SESSION_FEEDBACK_REQUIRED',
          link: '/patient'
        });
      }
    }

    await logAudit({
      actorId: doctor._id,
      actorRole: 'DOCTOR',
      action: 'LIVE_SESSION_COMPLETED',
      targetType: 'LIVE_SESSION',
      targetId: sessionId,
      details: { durationSeconds, doctorId: doctor._id, hasNotes: Boolean(clinicalNotes) }
    });

    res.json({
      message: 'Consultation concluded and recorded. Doctor is available again.',
      sessionId,
      session
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get patient clinical consultation records (Doc 1: Sec 4, 11; Doc 2: Sec 3, 16)
 */
router.get('/patient-records/:patientId', async (req, res) => {
  try {
    const sessions = await LiveSession.find({ 
      patientId: req.params.patientId,
      status: 'COMPLETED'
    })
      .populate('doctorId', 'name specialty plusRank credentials averageAiScore')
      .sort({ endedAt: -1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get doctor session history
 */
router.get('/:id/sessions', async (req, res) => {
  try {
    const sessions = await LiveSession.find({ doctorId: req.params.id })
      .populate('patientId', 'name')
      .sort({ startedAt: -1 })
      .limit(20);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
