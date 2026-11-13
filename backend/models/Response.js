const mongoose = require('mongoose');

const VersionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  editReason: { type: String, default: 'Updated clinical advice' }
});

const AiEvaluationSchema = new mongoose.Schema({
  relevance: { type: Number, default: 85, min: 0, max: 100 },
  completeness: { type: Number, default: 80, min: 0, max: 100 },
  clarity: { type: Number, default: 90, min: 0, max: 100 },
  safety: { type: Number, default: 95, min: 0, max: 100 },
  uncertaintyHandling: { type: Number, default: 88, min: 0, max: 100 },
  compositeScore: { type: Number, default: 87, min: 0, max: 100 },
  confidence: { type: Number, default: 0.92, min: 0, max: 1 },
  outcome: { 
    type: String, 
    enum: ['HIGH_CONFIDENCE_POSITIVE', 'POSITIVE_UNCERTAIN', 'REVIEW_REQUIRED', 'SAFETY_FLAG'],
    default: 'HIGH_CONFIDENCE_POSITIVE'
  },
  flags: [{ type: String }],
  modelIdentifier: { type: String, default: 'ByteMed-ClinicalEval-v1.4' },
  evaluationSummary: { type: String, default: '' },
  evaluatedAt: { type: Date, default: Date.now }
});

const ResponseSchema = new mongoose.Schema({
  queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentContent: { type: String, required: true },
  versions: [VersionSchema],
  
  // AI Response Evaluation (Doc 1: Sec 8, Doc 2: Sec 10)
  aiEvaluation: { type: AiEvaluationSchema, default: () => ({}) },

  // Peer Consensus & Endorsements (Doc 1: Sec 8, Doc 3: Sec 6)
  endorsements: [{
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '' },
    endorsedAt: { type: Date, default: Date.now }
  }],

  // Patient feedback snapshot
  feedback: {
    helpfulness: { type: Number, min: 1, max: 5 },
    clarity: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    submittedAt: { type: Date }
  },

  // Legacy field
  rating: { type: Number, min: 1, max: 5 },

  moderationStatus: {
    type: String,
    enum: ['APPROVED', 'FLAGGED', 'HIDDEN'],
    default: 'APPROVED'
  },
  reportCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Response', ResponseSchema);
