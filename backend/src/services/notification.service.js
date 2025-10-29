const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

/**
 * Create a new notification for a user
 */
const createNotification = async (userId, notificationData) => {
  try {
    const {
      title,
      message,
      type = 'info',
      actionUrl = null,
      expiresAt = null,
      relatedEntityType = null,
      relatedEntityId = null
    } = notificationData;

    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
        expires_at: expiresAt,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      }
    });

    logger.info(`Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw new Error('Failed to create notification');
  }
};

/**
 * Get user's notifications with pagination and filtering
 */
const getNotifications = async (userId, options = {}) => {
  try {
    const {
      unreadOnly = false,
      limit = 50,
      offset = 0,
      type = null,
    } = options;

    const where = {
      user_id: userId,
      ...(unreadOnly && { is_read: false }),
      ...(type && { type }),
      OR: [
        { expires_at: null },
        { expires_at: { gt: new Date() } },
      ],
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    return notifications;
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    throw new Error('Failed to retrieve notifications');
  }
};

/**
 * Mark notifications as read
 */
const markAsRead = async (userId, notificationIds) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        user_id: userId,
      },
      data: { is_read: true },
    });

    logger.info(`Marked ${result.count} notifications as read for user ${userId}`);
    return result;
  } catch (error) {
    logger.error('Failed to mark notifications as read:', error);
    throw new Error('Failed to update notifications');
  }
};

/**
 * Mark all user notifications as read
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    logger.info(`Marked all ${result.count} notifications as read for user ${userId}`);
    return result;
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    throw new Error('Failed to update notifications');
  }
};

/**
 * Send welcome notification to new user
 */
const notifyNewUserAccount = async (userData) => {
  try {
    const { id, full_name, email, role } = userData;

    const message = `Welcome to the Engineering Project Management System, ${full_name}! Your ${role} account has been created successfully.`;

    const notification = await createNotification(id, {
      title: 'Welcome to EngPro',
      message,
      type: 'success',
      actionUrl: '/dashboard'
    });

    logger.info(`Welcome notification sent to user ${id} (${email})`);
    return notification;
  } catch (error) {
    logger.error('Failed to send welcome notification:', error);
    // Don't throw - allow user creation to continue even if notification fails
    return null;
  }
};

/**
 * Delete a specific notification
 */
const deleteNotification = async (userId, notificationId) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    if (result.count === 0) {
      throw new Error('Notification not found or not authorized');
    }

    logger.info(`Deleted notification ${notificationId} for user ${userId}`);
    return result;
  } catch (error) {
    logger.error('Failed to delete notification:', error);
    throw new Error('Failed to delete notification');
  }
};

/**
 * Clean up expired notifications (for cron jobs)
 */
const cleanupExpiredNotifications = async () => {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired notifications`);
    return result;
  } catch (error) {
    logger.error('Failed to cleanup expired notifications:', error);
    throw new Error('Failed to cleanup notifications');
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  notifyNewUserAccount,
  deleteNotification,
  cleanupExpiredNotifications
};