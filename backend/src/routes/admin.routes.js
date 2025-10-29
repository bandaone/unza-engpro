const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All admin routes require authentication and coordinator role
router.use(protect);
router.use(authorize('coordinator'));

// GET /api/admin/statistics - Get system-wide statistics
router.get('/statistics', adminController.getSystemStatistics);

// GET /api/admin/reports/allocation - Get allocation report
router.get('/reports/allocation', adminController.getAllocationReport);

// GET /api/admin/reports/student-progress - Get student progress report
router.get('/reports/student-progress', adminController.getStudentProgressReport);

// GET /api/admin/system-settings - Get system settings
router.get('/system-settings', adminController.getSystemSettings);

// POST /api/admin/system-settings - Update system setting
router.post('/system-settings', adminController.updateSystemSetting);

module.exports = router;