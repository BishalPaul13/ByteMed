const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['RESPONSE', 'LIVE_SESSION'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  
  // Multi-dimensional feedback signals per Doc 1 (Sec 9) & Doc 2 (Sec 9)
  helpfulness: { type: Number, min: 1, max: 5, required: true },
  clarity: { type: Number, min: 1, max: 5, required: true },
  communication: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
  
  // Anti-manipulation trust score per Doc 3 (Sec 7)
  trustWeight: { type: Number, default: 1.0, min: 0.1, max: 1.0 },
  isFlaggedForAnomaly: { type: Boolean, default: false },
  anomalyReason: { type: String, default: '' }
}, { timestamps: true });

// Average rating computation helper
FeedbackSchema.virtual('averageScore').get(function() {
  return ((this.helpfulness + this.clarity + this.communication) / 3).toFixed(1);
});

module.exports = mongoose.model('Feedback', FeedbackSchema);

