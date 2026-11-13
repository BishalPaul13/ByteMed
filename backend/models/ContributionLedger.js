const mongoose = require('mongoose');

const ContributionLedgerSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contributionType: { 
    type: String, 
    enum: ['ASYNC_RESPONSE', 'LIVE_SESSION', 'COMMUNITY_VERIFICATION', 'PEER_ENDORSEMENT', 'FOLLOW_UP_REPLY'], 
    required: true 
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Response ID or LiveSession ID
  
  // Snapshots of the signals at contribution time
  aiEvaluationSnapshot: {
    compositeScore: { type: Number, default: 85 },
    confidence: { type: Number, default: 0.9 },
    safetyScore: { type: Number, default: 95 }
  },
  feedbackSnapshot: {
    averageRating: { type: Number, default: 5 },
    trustWeight: { type: Number, default: 1.0 }
  },
  
  // Derived points for this event
  pointsAwarded: { type: Number, required: true, default: 50 },
  formulaVersion: { type: String, default: 'v1.0-weighted-projection' },
  explanation: { type: String, default: 'Physician answer published and verified' },
  
  // Recalculation status
  isQuarantined: { type: Boolean, default: false },
  quarantineReason: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ContributionLedger', ContributionLedgerSchema);

