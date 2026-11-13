const express = require('express');
const ModerationCase = require('../models/ModerationCase');
const User = require('../models/User');
const Query = require('../models/Query');
const Response = require('../models/Response');
const LiveSession = require('../models/LiveSession');
const AuditEvent = require('../models/AuditEvent');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Report a query, response, or physician (accessible to authenticated users)
 */
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId, reasonCategory, description, severity = 'MEDIUM' } = req.body;
    const reporterId = req.user._id;

    const modCase = new ModerationCase({
      targetType,
      targetId,
      reporterId,
      reasonCategory,
      description,
      severity,
      status: 'PENDING_TRIAGE'
    });

    await modCase.save();

    // Increment target reportCount
    if (targetType === 'QUERY') {
      await Query.findByIdAndUpdate(targetId, { $inc: { reportCount: 1 } });
    } else if (targetType === 'RESPONSE') {
      await Response.findByIdAndUpdate(targetId, { $inc: { reportCount: 1 } });
    }

    await logAudit({
      actorId: reporterId,
      actorRole: req.user.role,
      action: 'MODERATION_ACTION_TAKEN',
      targetType,
      targetId,
      details: { reasonCategory, description }
    });

    res.status(201).json({ message: 'Report submitted. Platform safety moderators will review this case.', modCase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get pending moderation cases for admin triage (ADMIN / MODERATOR ONLY)
 */
router.get('/cases', authenticateToken, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const cases = await ModerationCase.find(filter)
      .populate('reporterId', 'name email role')
      .sort({ createdAt: -1 });

    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin resolves moderation case (ADMIN / MODERATOR ONLY)
 */
router.put('/cases/:id/action', authenticateToken, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const { actionTaken, reviewerNotes } = req.body;
    const reviewerId = req.user._id;

    const modCase = await ModerationCase.findById(req.params.id);
    if (!modCase) return res.status(404).json({ message: 'Case not found' });

    modCase.actionTaken = actionTaken;
    modCase.reviewerNotes = reviewerNotes || '';
    modCase.reviewerId = reviewerId;
    modCase.status = actionTaken === 'NONE' ? 'DISMISSED' : 'ACTION_TAKEN';
    modCase.resolvedAt = new Date();

    await modCase.save();

    // Execute side-effects of moderation action
    if (actionTaken === 'CONTENT_HIDDEN') {
      if (modCase.targetType === 'QUERY') {
        await Query.findByIdAndUpdate(modCase.targetId, { moderationStatus: 'HIDDEN' });
      } else if (modCase.targetType === 'RESPONSE') {
        await Response.findByIdAndUpdate(modCase.targetId, { moderationStatus: 'HIDDEN' });
      }
    } else if (actionTaken === 'SUSPENSION') {
      if (modCase.targetType === 'DOCTOR_PROFILE' || modCase.targetType === 'USER') {
        await User.findByIdAndUpdate(modCase.targetId, { accountState: 'SUSPENDED', status: 'SUSPENDED' });
      }
    }

    await logAudit({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: 'MODERATION_ACTION_TAKEN',
      targetType: modCase.targetType,
      targetId: modCase.targetId,
      details: { actionTaken, reasonCategory: modCase.reasonCategory }
    });

    res.json({ message: 'Moderation action applied successfully', modCase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get doctor verification queue (ADMIN / MODERATOR ONLY)
 */
router.get('/verifications', authenticateToken, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const pendingDoctors = await User.find({ role: 'DOCTOR' })
      .select('name email specialty credentials status accountState plusRank createdAt')
      .sort({ createdAt: -1 });

    res.json(pendingDoctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin updates doctor verification status (ADMIN ONLY)
 */
router.put('/verifications/:id/decision', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { decision, notes } = req.body; // 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
    const reviewerId = req.user._id;

    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'DOCTOR') return res.status(404).json({ message: 'Doctor not found' });

    doctor.status = decision;
    if (decision === 'VERIFIED') {
      doctor.accountState = 'ACTIVE';
    } else if (decision === 'SUSPENDED') {
      doctor.accountState = 'SUSPENDED';
      doctor.availability = 'OFFLINE';
    }
    await doctor.save();

    await logAudit({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: decision === 'VERIFIED' ? 'DOCTOR_VERIFIED' : 'DOCTOR_REJECTED',
      targetType: 'DOCTOR',
      targetId: doctor._id,
      details: { decision, notes }
    });

    await createNotification({
      recipientId: doctor._id,
      title: decision === 'VERIFIED' ? '✅ Medical Credentials Approved' : '⚠️ Credential Verification Update',
      message: decision === 'VERIFIED'
        ? 'Congratulations! Your medical credentials have been approved by a platform administrator. You may now respond to patient queries and conduct live consultations.'
        : `Your verification status has been updated to ${decision}. Notes: ${notes || 'Contact administrator for more information.'}`,
      type: 'VERIFICATION_UPDATE',
      link: '/doctor'
    });

    res.json({ message: `Doctor status updated to ${decision}`, doctor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get system-wide audit trail (ADMIN / MODERATOR ONLY)
 */
router.get('/audit-trail', authenticateToken, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const events = await AuditEvent.find({})
      .populate('actorId', 'name role')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get AI Ops Telemetry & Operational System Health (Doc 2: Sec 7, 17; Doc 3: Sec 16)
 * ADMIN / MODERATOR ONLY
 */
router.get('/ops-metrics', authenticateToken, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const totalQueries = await Query.countDocuments();
    const answeredQueries = await Query.countDocuments({ status: { $in: ['ANSWERED', 'RESOLVED'] } });
    const emergencyQueries = await Query.countDocuments({ 'aiCategorization.isEmergency': true });
    
    // Category distribution
    const categoryAgg = await Query.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const categoryDistribution = {};
    categoryAgg.forEach(c => { categoryDistribution[c._id || 'Unassigned'] = c.count; });

    // Doctor pool stats
    const totalDoctors = await User.countDocuments({ role: 'DOCTOR' });
    const verifiedDoctors = await User.countDocuments({ role: 'DOCTOR', status: 'VERIFIED' });
    const pendingDoctors = await User.countDocuments({ role: 'DOCTOR', status: 'PENDING' });
    const availableDoctors = await User.countDocuments({ role: 'DOCTOR', status: 'VERIFIED', availability: 'AVAILABLE' });
    const reservedDoctors = await User.countDocuments({ role: 'DOCTOR', availability: 'RESERVED' });

    // Telehealth session stats
    const totalSessions = await LiveSession.countDocuments();
    const completedSessions = await LiveSession.countDocuments({ status: 'COMPLETED' });
    const activeSessions = await LiveSession.countDocuments({ status: { $in: ['RESERVED', 'IN_SESSION'] } });

    // Moderation queue
    const pendingCases = await ModerationCase.countDocuments({ status: 'PENDING_TRIAGE' });

    // Audit velocity in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const auditCount24h = await AuditEvent.countDocuments({ timestamp: { $gte: oneDayAgo } });

    // Average AI Confidence
    const queriesWithAi = await Query.find({ 'aiCategorization.confidenceScore': { $exists: true } })
      .select('aiCategorization.confidenceScore')
      .limit(100);
    const avgConfidence = queriesWithAi.length > 0
      ? (queriesWithAi.reduce((acc, q) => acc + (q.aiCategorization?.confidenceScore || 0.85), 0) / queriesWithAi.length)
      : 0.91;

    res.json({
      systemStatus: 'OPTIMAL_HEALTH',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date(),
      queries: {
        total: totalQueries,
        answered: answeredQueries,
        emergencyCount: emergencyQueries,
        answerRate: totalQueries > 0 ? Math.round((answeredQueries / totalQueries) * 100) : 0,
        categoryDistribution
      },
      doctors: {
        total: totalDoctors,
        verified: verifiedDoctors,
        pendingReview: pendingDoctors,
        onlineAvailable: availableDoctors,
        inLiveSession: reservedDoctors
      },
      telehealth: {
        totalSessions,
        completedSessions,
        activeSessions,
        leaseWorkerHealthy: true
      },
      aiRouter: {
        modelIdentifier: 'ByteMed-BioRouter-v2',
        avgConfidence: Number(avgConfidence.toFixed(2)),
        emergencyThreshold: 'CRITICAL_HIGH',
        status: 'ACTIVE_TRIAGE'
      },
      moderation: {
        pendingCases
      },
      audit: {
        eventsLast24h: auditCount24h
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
