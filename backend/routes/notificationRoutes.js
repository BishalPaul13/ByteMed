const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * Get user notifications and unread count
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipientId: req.params.userId,
      isRead: false
    });

    res.json({
      unreadCount,
      notifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark a single notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark all notifications for a user as read
 */
router.put('/user/:userId/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.params.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

