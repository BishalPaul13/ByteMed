const Notification = require('../models/Notification');

async function createNotification({ recipientId, title, message, type = 'RESPONSE_RECEIVED', link = '' }) {
  try {
    return await Notification.create({
      recipientId,
      title,
      message,
      type,
      link,
      isRead: false
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
}

module.exports = {
  createNotification
};

