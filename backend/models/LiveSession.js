const mongoose = require('mongoose');

const LiveSessionSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomUrl: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: ['RESERVED', 'CONNECTING', 'IN_SESSION', 'COMPLETED', 'CANCELLED', 'TIMEOUT_EXPIRED'], 
    default: 'RESERVED' 
  },
  
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  
  // Lease / Heartbeat timeout per Doc 3 (Sec 9, 10)
  reservationExpiresAt: { type: Date },
  lastHeartbeat: { type: Date, default: Date.now },
  reconnectState: {
    type: String,
    enum: ['STABLE', 'RECONNECTING', 'INTERRUPTED'],
    default: 'STABLE'
  },

  // In-session clinical summary written by doctor
  clinicalNotes: { type: String, default: '' },
  prescribedRecommendations: { type: String, default: '' },
  
  // Feedback link
  feedbackSubmitted: { type: Boolean, default: false },
  feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
  
  // Contribution ledger reference
  contributionRecorded: { type: Boolean, default: false },
  ledgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContributionLedger' }
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', LiveSessionSchema);
