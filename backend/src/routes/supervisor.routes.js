const express = require('express');
const router = express.Router();
const supervisorController = require('../controllers/supervisor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All supervisor management routes are protected and restricted to coordinators
router.use(protect, authorize('coordinator'));

// GET /api/supervisors
router.get('/', supervisorController.getSupervisors);

// POST /api/supervisors
router.post('/', supervisorController.createSupervisor);

// GET /api/supervisors/:id
router.get('/:id', supervisorController.getSupervisorById);

// PUT /api/supervisors/:id
router.put('/:id', supervisorController.updateSupervisor);

module.exports = router;
