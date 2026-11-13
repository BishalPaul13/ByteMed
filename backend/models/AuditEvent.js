const mongoose = require('mongoose');

const AuditEventSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String, default: 'SYSTEM' },
  action: { 
    type: String, 
    required: true,
    enum: [
      'USER_REGISTERED',
      'DOCTOR_CREDENTIALS_SUBMITTED',
      'DOCTOR_VERIFIED',
      'DOCTOR_REJECTED',
      'DOCTOR_AVAILABILITY_CHANGED',
      'QUERY_PUBLISHED',
      'RESPONSE_PUBLISHED',
      'RESPONSE_EDITED',
      'FEEDBACK_SUBMITTED',
      'LIVE_SESSION_BOOKED',
      'LIVE_SESSION_COMPLETED',
      'REPUTATION_RECALCULATED',
      'MODERATION_ACTION_TAKEN'
    ]
  },
  targetType: { type: String },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditEvent', AuditEventSchema);

