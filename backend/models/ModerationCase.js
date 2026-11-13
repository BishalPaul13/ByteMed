const mongoose = require('mongoose');

const ModerationCaseSchema = new mongoose.Schema({
  targetType: { 
    type: String, 
    enum: ['QUERY', 'RESPONSE', 'DOCTOR_PROFILE', 'USER'], 
    required: true 
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Specific healthcare nuance distinction per Doc 2 (Sec 13)
  reasonCategory: {
    type: String,
    enum: [
      'CLINICALLY_UNSAFE',     // Overconfident advice, contraindications, emergency negligence
      'HARASSMENT_ABUSE',      // Inappropriate tone, bullying
      'SPAM_PROMOTION',        // Commercial selling, off-platform solicitation
      'PRIVACY_VIOLATION',     // PII, face images, identifiable private health info
      'OTHER_RULE_VIOLATION'   // General terms of service breach
    ],
    required: true
  },
  
  description: { type: String, required: true },
  
  severity: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL_SAFETY'], 
    default: 'MEDIUM' 
  },
  
  status: { 
    type: String, 
    enum: ['PENDING_TRIAGE', 'UNDER_REVIEW', 'ACTION_TAKEN', 'DISMISSED', 'APPEALED'], 
    default: 'PENDING_TRIAGE' 
  },
  
  actionTaken: {
    type: String,
    enum: ['NONE', 'WARNING_ISSUED', 'CONTENT_HIDDEN', 'TEMPORARY_RESTRICTION', 'SUSPENSION'],
    default: 'NONE'
  },
  
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewerNotes: { type: String, default: '' },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ModerationCase', ModerationCaseSchema);

