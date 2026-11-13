const mongoose = require('mongoose');

const FollowUpSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reply: { type: String, default: '' },
  repliedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const QuerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['DRAFT', 'OPEN', 'ANSWERED', 'RESOLVED', 'CLOSED'], 
    default: 'OPEN' 
  },
  
  // Privacy per Document 1 & 2
  isAnonymous: { type: Boolean, default: false },

  // Multi-modal media inputs per Section 5 of Lifecycle Model
  media: {
    voice: {
      hasVoice: { type: Boolean, default: false },
      audioUrl: { type: String, default: null },
      transcript: { type: String, default: null },
      transcriptConfidence: { type: Number, default: 0 },
      isEditedByPatient: { type: Boolean, default: false }
    },
    images: [{
      url: { type: String, required: true },
      label: { type: String, default: 'Medical Photo' },
      aiObservation: { type: String, default: '' },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },

  // AI Categorization & Safety-Routing (Doc 1: Sec 6, Doc 2: Sec 7)
  aiCategorization: {
    predictedCategory: { type: String, default: 'General' },
    subCategory: { type: String, default: 'General Practice' },
    confidenceScore: { type: Number, default: 0.85 },
    urgencyLevel: { 
      type: String, 
      enum: ['NORMAL', 'ELEVATED', 'CRITICAL_EMERGENCY'], 
      default: 'NORMAL' 
    },
    safetySignal: { type: String, default: 'No critical red flags detected.' },
    isEmergency: { type: Boolean, default: false },
    broadRouting: { type: Boolean, default: false }, // Broadened routing when confidence is low
    modelIdentifier: { type: String, default: 'ByteMed-BioRouter-v2' },
    routingExplanation: { type: String, default: '' }
  },

  // Patient Follow-Up Questions (Doc 1: Sec 6, 8; Doc 3: Sec 3)
  followUps: [FollowUpSchema],

  // Moderation state
  moderationStatus: {
    type: String,
    enum: ['APPROVED', 'FLAGGED', 'HIDDEN'],
    default: 'APPROVED'
  },
  reportCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Query', QuerySchema);
