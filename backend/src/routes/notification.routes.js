const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All notification routes require authentication
router.use(protect);

// GET /api/notifications - Get all notifications for the logged-in user
router.get('/', notificationController.getNotifications);

// POST /api/notifications - Create a new notification (admin/coordinator only)
router.post('/', authorize('coordinator'), notificationController.createNotification);

// POST /api/notifications/notify - Send notification with optional email (admin/coordinator only)
router.post('/notify', authorize('coordinator'), notificationController.notifyUser);

// PUT /api/notifications/read - Mark multiple notifications as read
router.put('/read', notificationController.markAsRead);

// DELETE /api/notifications/expired - Delete expired notifications (admin/coordinator only)
router.delete('/expired', authorize('coordinator'), notificationController.deleteExpired);

module.exports = router;
