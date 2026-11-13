const express = require('express');
const Query = require('../models/Query');
const User = require('../models/User');
const Response = require('../models/Response');
const { analyzeQuery } = require('../services/aiService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { recordContribution } = require('../services/reputationService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Preview AI Triage & Categorization in real-time before patient submits
 */
router.post('/simulate-triage', (req, res) => {
  try {
    const { title, description, transcript, imageObservations } = req.body;
    const analysis = analyzeQuery({ title, description, transcript, imageObservations });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Simulate Voice Speech-to-Text Transcription with confidence (Doc 1: Sec 6, Doc 3: Sec 3)
 */
router.post('/transcribe-voice', (req, res) => {
  try {
    const { voiceSampleType } = req.body;
    // Provide realistic clinical audio transcriptions based on sample selection or generic
    const samples = {
      cardio: {
        transcript: 'I have been experiencing a sudden heaviness in my chest since this afternoon, and it tingles down my left arm when I exert myself.',
        confidence: 0.96,
        audioUrl: 'mock_audio_sample_cardio.wav'
      },
      derm: {
        transcript: 'I developed this circular reddish ring on my forearm after yard work. It has a raised scaly border and itches intermittently.',
        confidence: 0.94,
        audioUrl: 'mock_audio_sample_derm.wav'
      },
      neuro: {
        transcript: 'Severe throbbing migraine centered behind my left temple for three days. Bright lights and computer screens make it much worse.',
        confidence: 0.93,
        audioUrl: 'mock_audio_sample_neuro.wav'
      },
      general: {
        transcript: 'Running a low-grade fever with muscle aches and a persistent dry cough for the past four days.',
        confidence: 0.95,
        audioUrl: 'mock_audio_sample_general.wav'
      }
    };

    const result = samples[voiceSampleType] || samples.general;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a new patient query with multi-modal attachments & AI categorization pipeline
 */
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      patientId, 
      isAnonymous = false,
      voiceData = null, 
      images = [] 
    } = req.body;

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Run AI Categorization & Safety-Routing pipeline
    const aiAnalysis = analyzeQuery({
      title,
      description,
      transcript: voiceData?.transcript || '',
      imageObservations: images.map(img => img.aiObservation || '')
    });

    // Use AI recommended category if user selected General or if AI found strong specialty
    const finalCategory = (category && category !== 'General') ? category : aiAnalysis.predictedCategory;

    const query = new Query({
      title,
      description,
      category: finalCategory,
      patientId,
      isAnonymous,
      media: {
        voice: voiceData ? {
          hasVoice: true,
          audioUrl: voiceData.audioUrl || 'simulated_patient_audio.wav',
          transcript: voiceData.transcript,
          transcriptConfidence: voiceData.confidence || 0.94,
          isEditedByPatient: voiceData.isEdited || false
        } : { hasVoice: false },
        images: images.map(img => ({
          url: img.url,
          label: img.label || 'Patient Clinical Upload',
          aiObservation: img.aiObservation || 'Image attached for physician visual triage'
        }))
      },
      aiCategorization: {
        ...aiAnalysis,
        predictedCategory: finalCategory
      },
      status: 'OPEN'
    });

    await query.save();

    // Log to Audit trail
    await logAudit({
      actorId: patientId,
      actorRole: 'PATIENT',
      action: 'QUERY_PUBLISHED',
      targetType: 'QUERY',
      targetId: query._id,
      details: { title, category: finalCategory, isEmergency: aiAnalysis.isEmergency }
    });

    // Notify verified doctors in this category
    const doctorsInSpecialty = await User.find({
      role: 'DOCTOR',
      status: 'VERIFIED',
      $or: [{ specialty: finalCategory }, { specialty: 'General' }]
    }).limit(10);

    for (const doc of doctorsInSpecialty) {
      await createNotification({
        recipientId: doc._id,
        title: `🩺 New ${finalCategory} Case Published`,
        message: `A patient published an inquiry: "${title}". Clinical AI categorized it as ${finalCategory}.`,
        type: 'QUERY_PUBLISHED',
        link: '/doctor'
      });
    }

    res.status(201).json(query);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get queries with category filter, search, and status
 * PRIVACY RULE: Patients can ONLY view their own queries. Doctors/Admins can view all.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, patientId, status } = req.query;
    const filter = { moderationStatus: { $ne: 'HIDDEN' } };

    // Strict privacy enforcement
    if (req.user.role === 'PATIENT') {
      filter.patientId = req.user._id;
    } else if (patientId) {
      filter.patientId = patientId;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (status) {
      filter.status = status;
    }

    const queries = await Query.find(filter)
      .populate('patientId', 'name')
      .populate('followUps.patientId', 'name')
      .populate('followUps.doctorId', 'name specialty plusRank rankNumber')
      .sort({ createdAt: -1 });

    // Handle anonymity: if isAnonymous is true, hide patient name for doctors if set
    const sanitizedQueries = queries.map(q => {
      const obj = q.toObject();
      if (obj.isAnonymous && obj.patientId && req.user.role !== 'PATIENT') {
        obj.patientId = { _id: obj.patientId._id, name: 'Anonymous Patient' };
      }
      return obj;
    });

    res.json(sanitizedQueries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get single query by ID
 * PRIVACY RULE: Patients can only access their own query. Doctors can access any query.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id)
      .populate('patientId', 'name')
      .populate('followUps.patientId', 'name')
      .populate('followUps.doctorId', 'name specialty plusRank rankNumber');
    if (!query) return res.status(404).json({ message: 'Query not found' });
    
    // Privacy check for patients
    if (req.user.role === 'PATIENT' && query.patientId?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only view your own questions.' });
    }

    const obj = query.toObject();
    if (obj.isAnonymous && obj.patientId && req.user.role !== 'PATIENT') {
      obj.patientId = { _id: obj.patientId._id, name: 'Anonymous Patient' };
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Patient asks a follow-up question (Doc 1: Sec 6, 8; Doc 3: Sec 3)
 */
router.post('/:id/follow-up', async (req, res) => {
  try {
    const { patientId, question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Question cannot be empty' });
    }

    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ message: 'Query not found' });

    query.followUps.push({
      patientId,
      question: question.trim(),
      createdAt: new Date()
    });

    await query.save();

    // Audit log
    await logAudit({
      actorId: patientId,
      actorRole: 'PATIENT',
      action: 'QUERY_FOLLOWUP_CREATED',
      targetType: 'QUERY',
      targetId: query._id,
      details: { question: question.substring(0, 100) }
    });

    // Notify doctors who responded to this query
    const responses = await Response.find({ queryId: query._id });
    const doctorIds = [...new Set(responses.map(r => r.doctorId.toString()))];

    for (const docId of doctorIds) {
      await createNotification({
        recipientId: docId,
        title: '❓ Patient Asked a Follow-Up Question',
        message: `A patient requested clinical clarification on "${query.title}": "${question.substring(0, 80)}..."`,
        type: 'QUERY_PUBLISHED',
        link: '/doctor'
      });
    }

    const populated = await Query.findById(query._id)
      .populate('patientId', 'name')
      .populate('followUps.patientId', 'name')
      .populate('followUps.doctorId', 'name specialty plusRank rankNumber');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verified Doctor replies to patient follow-up question (Doc 1: Sec 8, Doc 3: Sec 3)
 */
router.post('/:id/follow-up/:followUpId/reply', async (req, res) => {
  try {
    const { doctorId, reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply cannot be empty' });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'DOCTOR' || doctor.status !== 'VERIFIED') {
      return res.status(403).json({ message: 'Only verified physicians can reply to patient follow-ups.' });
    }

    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ message: 'Query not found' });

    const followUp = query.followUps.id(req.params.followUpId);
    if (!followUp) return res.status(404).json({ message: 'Follow-up question not found' });

    followUp.doctorId = doctorId;
    followUp.reply = reply.trim();
    followUp.repliedAt = new Date();

    await query.save();

    // Record in Contribution Ledger for the doctor
    await recordContribution({
      doctorId,
      contributionType: 'FOLLOW_UP_REPLY',
      referenceId: query._id,
      aiEvaluation: null,
      feedback: null
    });

    // Audit log
    await logAudit({
      actorId: doctorId,
      actorRole: 'DOCTOR',
      action: 'QUERY_FOLLOWUP_REPLIED',
      targetType: 'QUERY',
      targetId: query._id,
      details: { followUpId: followUp._id, replySummary: reply.substring(0, 100) }
    });

    // Notify patient
    await createNotification({
      recipientId: query.patientId,
      title: '🩺 Physician Replied to Your Follow-Up',
      message: `Dr. ${doctor.name} (${doctor.plusRank}) provided clarification to your question on "${query.title}".`,
      type: 'RESPONSE_RECEIVED',
      link: '/patient'
    });

    const populated = await Query.findById(query._id)
      .populate('patientId', 'name')
      .populate('followUps.patientId', 'name')
      .populate('followUps.doctorId', 'name specialty plusRank rankNumber');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Close or Resolve query
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['OPEN', 'ANSWERED', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const query = await Query.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!query) return res.status(404).json({ message: 'Query not found' });

    res.json(query);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
