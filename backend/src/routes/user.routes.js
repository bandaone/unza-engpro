const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All user management routes are protected and restricted to coordinators
router.use(protect, authorize('coordinator'));

// GET /api/users
router.get('/', userController.getUsers);

// GET /api/users/:id
router.get('/:id', userController.getUserById);

// PUT /api/users/:id
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id
router.delete('/:id', userController.deleteUser);

// The following routes are for a user's own profile
// They are handled separately and are not restricted to coordinators
router.get('/me/profile', protect, userController.getUserProfile);
router.put('/me/profile', protect, userController.updateUserProfile);

module.exports = router;
