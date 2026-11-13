const express = require('express');
const Response = require('../models/Response');
const Query = require('../models/Query');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const { evaluateDoctorResponse } = require('../services/aiService');
const { recordContribution, recomputeDoctorReputation } = require('../services/reputationService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Doctor submits clinical response
 * Triggers AI Response Evaluation & Contribution Ledger Logging (Doc 1: Sec 7, 8; Doc 2: Sec 8, 10, 11)
 */
router.post('/', async (req, res) => {
  try {
    const { queryId, doctorId, content } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.role !== 'DOCTOR' || doctor.status !== 'VERIFIED') {
      return res.status(403).json({ message: 'Only verified medical practitioners can publish clinical responses.' });
    }

    const query = await Query.findById(queryId);
    if (!query) return res.status(404).json({ message: 'Query not found' });

    // 1. Run AI Clinical Response Evaluation Pipeline
    const aiEvaluation = evaluateDoctorResponse(query.title + ' ' + query.description, content);

    // 2. Save Response with AI Evaluation and initial version
    const response = new Response({
      queryId,
      doctorId,
      currentContent: content,
      versions: [{ content, timestamp: new Date(), editReason: 'Initial published clinical guidance' }],
      aiEvaluation
    });

    await response.save();

    // 3. Mark query as ANSWERED
    query.status = 'ANSWERED';
    await query.save();

    // 4. Record contribution in the immutable Contribution Ledger & update doctor reputation
    await recordContribution({
      doctorId,
      contributionType: 'ASYNC_RESPONSE',
      referenceId: response._id,
      aiEvaluation,
      feedback: null
    });

    // 5. Audit Log
    await logAudit({
      actorId: doctorId,
      actorRole: 'DOCTOR',
      action: 'RESPONSE_PUBLISHED',
      targetType: 'RESPONSE',
      targetId: response._id,
      details: { queryId, aiScore: aiEvaluation.compositeScore, outcome: aiEvaluation.outcome }
    });

    // 6. Notify Patient
    await createNotification({
      recipientId: query.patientId,
      title: '🩺 Physician Responded to Your Query',
      message: `Dr. ${doctor.name} (${doctor.plusRank}) provided clinical advice on "${query.title}".`,
      type: 'RESPONSE_RECEIVED',
      link: '/patient'
    });

    const populated = await Response.findById(response._id).populate('doctorId', 'name plusRank specialty averageAiScore');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Doctor edits clinical response
 * Preserves immutable version history & re-evaluates AI quality (Doc 1: Sec 8, Doc 2: Sec 9, Doc 3: Sec 5)
 */
router.put('/:id', async (req, res) => {
  try {
    const { content, editReason = 'Clinical revision' } = req.body;
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ message: 'Response not found' });

    const query = await Query.findById(response.queryId);

    // 1. Re-evaluate with AI
    const aiEvaluation = evaluateDoctorResponse(
      query ? (query.title + ' ' + query.description) : '',
      content
    );

    // 2. Update current content and append new immutable version
    response.currentContent = content;
    response.aiEvaluation = aiEvaluation;
    response.versions.push({
      content,
      timestamp: new Date(),
      editReason
    });

    await response.save();

    // 3. Audit Log
    await logAudit({
      actorId: response.doctorId,
      actorRole: 'DOCTOR',
      action: 'RESPONSE_EDITED',
      targetType: 'RESPONSE',
      targetId: response._id,
      details: { editReason, aiScore: aiEvaluation.compositeScore }
    });

    // 4. Update ledger score
    await recomputeDoctorReputation(response.doctorId);

    const populated = await Response.findById(response._id)
      .populate('doctorId', 'name plusRank rankNumber specialty averageAiScore credentials')
      .populate('endorsements.doctorId', 'name plusRank specialty');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Multi-Dimensional Patient Feedback with Anti-Gaming Checks (Doc 1: Sec 9, Doc 2: Sec 9, Doc 3: Sec 7)
 */
router.post('/:id/feedback', async (req, res) => {
  try {
    const { patientId, helpfulness = 5, clarity = 5, communication = 5, comment = '' } = req.body;
    
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ message: 'Response not found' });

    // Anti-gaming Check 1: Self-rating prevention
    if (response.doctorId.toString() === patientId) {
      return res.status(400).json({ message: 'Physicians cannot submit feedback on their own clinical responses.' });
    }

    // Anti-gaming Check 2: Verify user exists and check for rapid repeat submissions
    const existingFeedback = await Feedback.findOne({
      targetType: 'RESPONSE',
      targetId: response._id,
      patientId
    });

    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already submitted feedback for this response.' });
    }

    // Save multi-dimensional feedback
    const feedback = new Feedback({
      patientId,
      doctorId: response.doctorId,
      targetType: 'RESPONSE',
      targetId: response._id,
      helpfulness: Math.max(1, Math.min(5, Number(helpfulness))),
      clarity: Math.max(1, Math.min(5, Number(clarity))),
      communication: Math.max(1, Math.min(5, Number(communication))),
      comment,
      trustWeight: 1.0
    });

    await feedback.save();

    // Snapshot onto response
    response.feedback = {
      helpfulness: feedback.helpfulness,
      clarity: feedback.clarity,
      communication: feedback.communication,
      comment: feedback.comment,
      submittedAt: new Date()
    };
    response.rating = Math.round((feedback.helpfulness + feedback.clarity + feedback.communication) / 3);
    await response.save();

    // Record or update contribution ledger with feedback
    await recordContribution({
      doctorId: response.doctorId,
      contributionType: 'ASYNC_RESPONSE',
      referenceId: response._id,
      aiEvaluation: response.aiEvaluation,
      feedback
    });

    // Notify doctor
    await createNotification({
      recipientId: response.doctorId,
      title: '⭐ New Patient Feedback Received',
      message: `A patient rated your clinical response ${feedback.helpfulness}/5 for helpfulness.`,
      type: 'FEEDBACK_RECEIVED',
      link: '/doctor'
    });

    res.json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Legacy rating endpoint (preserves backward compatibility while bridging to multi-dimensional)
 */
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ message: 'Response not found' });

    response.rating = rating;
    response.feedback = {
      helpfulness: rating,
      clarity: rating,
      communication: rating,
      comment: 'Standard star rating',
      submittedAt: new Date()
    };
    await response.save();

    const doctor = await User.findById(response.doctorId);
    if (doctor) {
      doctor.updateRank(rating);
      await doctor.save();
    }

    res.json({ message: 'Rating submitted', response, newRank: doctor ? doctor.plusRank : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Physician Peer Consensus & Endorsement (Doc 1: Sec 8, Doc 3: Sec 6)
 */
router.post('/:id/endorse', async (req, res) => {
  try {
    const { doctorId, note = '' } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'DOCTOR' || doctor.status !== 'VERIFIED') {
      return res.status(403).json({ message: 'Only verified physicians can endorse clinical responses.' });
    }

    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ message: 'Response not found' });

    // Anti-gaming Check 1: Cannot endorse own response
    if (response.doctorId.toString() === doctorId) {
      return res.status(400).json({ message: 'Physicians cannot endorse their own clinical response.' });
    }

    // Anti-gaming Check 2: Cannot duplicate endorsement
    const alreadyEndorsed = response.endorsements?.some(e => e.doctorId.toString() === doctorId);
    if (alreadyEndorsed) {
      return res.status(400).json({ message: 'You have already endorsed this clinical response.' });
    }

    // Add endorsement
    response.endorsements.push({
      doctorId,
      note: note.trim(),
      endorsedAt: new Date()
    });

    await response.save();

    // 1. Award contribution points to endorsing doctor for peer review
    await recordContribution({
      doctorId,
      contributionType: 'PEER_ENDORSEMENT',
      referenceId: response._id,
      aiEvaluation: null,
      feedback: null
    });

    // 2. Award consensus bonus to original author
    await recordContribution({
      doctorId: response.doctorId,
      contributionType: 'PEER_ENDORSEMENT',
      referenceId: response._id,
      aiEvaluation: null,
      feedback: null
    });

    // 3. Audit log
    await logAudit({
      actorId: doctorId,
      actorRole: 'DOCTOR',
      action: 'RESPONSE_PEER_ENDORSED',
      targetType: 'RESPONSE',
      targetId: response._id,
      details: { authorDoctorId: response.doctorId, note }
    });

    // 4. Notify author doctor
    await createNotification({
      recipientId: response.doctorId,
      title: '🤝 Peer Physician Endorsed Your Advice',
      message: `Dr. ${doctor.name} (${doctor.plusRank}) seconded your clinical advice${note ? `: "${note}"` : '.'}`,
      type: 'VERIFICATION_UPDATE',
      link: '/doctor'
    });

    const populated = await Response.findById(response._id)
      .populate('doctorId', 'name plusRank rankNumber specialty averageAiScore credentials')
      .populate('endorsements.doctorId', 'name plusRank specialty');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all responses for a query
 * PRIVACY RULE: Patients can only fetch responses for queries they own. Doctors can fetch for any query.
 */
router.get('/query/:queryId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'PATIENT') {
      const query = await Query.findById(req.params.queryId);
      if (!query || query.patientId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. You can only view answers to your own questions.' });
      }
    }

    const responses = await Response.find({ 
      queryId: req.params.queryId,
      moderationStatus: { $ne: 'HIDDEN' }
    })
      .populate('doctorId', 'name plusRank rankNumber specialty averageAiScore credentials')
      .populate('endorsements.doctorId', 'name plusRank specialty')
      .sort({ createdAt: -1 });

    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
