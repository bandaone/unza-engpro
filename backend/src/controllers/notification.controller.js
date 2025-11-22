const notificationService = require('../services/notification.service');
const { ApiError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Get notifications for the authenticated user
 * @route GET /api/notifications
 * @access Private
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, limit, offset, type } = req.query;
    
    const options = {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      type
    };

    const notifications = await notificationService.getUserNotifications(req.user.id, options);
    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notifications count
 * @route GET /api/notifications/unread/count
 * @access Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create and send a notification
 * @route POST /api/notifications
 * @access Private (Admin/Coordinator)
 */
exports.createNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type, relatedEntityType, relatedEntityId, actionUrl } = req.body;

    if (!userId || !message) {
      throw new ApiError('User ID and message are required', 400);
    }

    const notification = await notificationService.createNotification({
      userId,
      title,
      message,
      type,
      relatedEntityType,
      relatedEntityId,
      actionUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(201).json(notification);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Error creating notification', 
      error: error.message 
    });
  }
};

/**
 * Mark notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ 
        message: 'notificationIds must be a non-empty array' 
      });
    }

    await notificationService.markAsRead(userId, notificationIds);
    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('not authorized')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Error marking notifications as read', 
      error: error.message 
    });
  }
};

/**
 * Delete expired notifications (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteExpired = async (req, res) => {
  try {
    const result = await notificationService.deleteExpiredNotifications();
    res.status(200).json({ 
      message: 'Expired notifications deleted', 
      count: result.count 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting expired notifications', 
      error: error.message 
    });
  }
};

/**
 * Send a notification with optional email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notifyUser = async (req, res) => {
  try {
    const { userId, notification, email } = req.body;

    if (!userId || !notification || !notification.message) {
      return res.status(400).json({ 
        message: 'userId and notification.message are required' 
      });
    }

    const result = await notificationService.notifyUser(userId, notification, email);
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Error sending notification', 
      error: error.message 
    });
  }
};

module.exports = {
  getNotifications: exports.getNotifications,
  createNotification: exports.createNotification,
  markAsRead,
  deleteExpired,
  notifyUser
};
