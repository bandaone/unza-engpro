const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All group routes require authentication
router.use(protect);

// GET /api/groups - Accessible by coordinators
router.get('/', authorize('coordinator'), groupController.getGroups);

// POST /api/groups/pair-students - Only Coordinators can pair students
router.post('/pair-students', authorize('coordinator'), groupController.pairStudents);

// GET /api/groups/:id - Accessible by coordinators
router.get('/:id', authorize('coordinator'), groupController.getGroupById);

// PUT /api/groups/:id - Accessible by coordinators
router.put('/:id', authorize('coordinator'), groupController.updateGroup);

// DELETE /api/groups/:id - Accessible by coordinators
router.delete('/:id', authorize('coordinator'), groupController.deleteGroup);

// POST /api/groups/:id/split-request - Only Students can request a group split
router.post('/:id/split-request', authorize('student'), groupController.requestGroupSplit);

// POST /api/groups/split-requests/:id/approve - Only Coordinators can approve split requests
router.post('/split-requests/:id/approve', authorize('coordinator'), groupController.approveGroupSplit);

// POST /api/groups/split-requests/:id/reject - Only Coordinators can reject split requests
router.post('/split-requests/:id/reject', authorize('coordinator'), groupController.rejectGroupSplit);

module.exports = router;
