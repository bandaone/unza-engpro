const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Require authentication for all user-oriented routes
router.use(protect);

// Self-service profile routes (accessible to any authenticated user)
router.get('/me/profile', userController.getUserProfile);
router.put('/me/profile', userController.updateUserProfile);

// Coordinator-only management routes
router.use(authorize('coordinator'));

// POST /api/users
router.post('/', userController.createUser);

// GET /api/users
router.get('/', userController.getUsers);

// GET /api/users/:id
router.get('/:id', userController.getUserById);

// PUT /api/users/:id
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;
