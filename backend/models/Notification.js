const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'QUERY_PUBLISHED',
      'RESPONSE_RECEIVED',
      'FEEDBACK_RECEIVED',
      'SESSION_INVITE',
      'SESSION_FEEDBACK_REQUIRED',
      'RANK_ADVANCEMENT',
      'VERIFICATION_UPDATE',
      'MODERATION_ALERT'
    ],
    default: 'RESPONSE_RECEIVED'
  },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);

