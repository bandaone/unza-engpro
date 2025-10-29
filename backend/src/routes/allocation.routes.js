const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocation.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All allocation routes require authentication
router.use(protect);

// POST /api/allocations/run - Only Coordinators can run allocation algorithms
router.post('/run', authorize('coordinator'), allocationController.runAllocation);

// GET /api/allocations/status - Accessible by all authenticated users
router.get('/status', allocationController.getAllocationStatus);

// GET /api/allocations/results - Accessible by all authenticated users
router.get('/results', allocationController.getAllocationResults);

// POST /api/allocations/preferences - Only Students can submit preferences
router.post('/preferences', authorize('student'), allocationController.submitPreferences);

// GET /api/allocations/preferences/me - Only Students can view their own preferences
router.get('/preferences/me', authorize('student'), allocationController.getMyPreferences);

// POST /api/allocations/manual - Only Coordinators can perform manual allocations
router.post('/manual', authorize('coordinator'), allocationController.manualAllocate);

// PUT /api/allocations/:id - Only Coordinators can update allocations
router.put('/:id', authorize('coordinator'), allocationController.updateAllocation);

// DELETE /api/allocations/:id - Only Coordinators can delete allocations
router.delete('/:id', authorize('coordinator'), allocationController.deleteAllocation);

module.exports = router;
