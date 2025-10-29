const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth.middleware');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout (requires auth)
router.post('/logout', protect, authController.logout);

// POST /api/auth/refresh-token (requires auth)
router.post('/refresh-token', protect, authController.refreshToken);

// POST /api/auth/change-password (requires auth)
router.post('/change-password', protect, authController.changePassword);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// GET /api/auth/me
router.get('/me', protect, authorize('student', 'supervisor', 'coordinator'), authController.getMe);

module.exports = router;
