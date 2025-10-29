const express = require('express');
const router = express.Router();
const logbookController = require('../controllers/logbook.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateLogbookEntry, validateLogbookComment } = require('../middleware/logbook.validation');

// All logbook routes require authentication
router.use(protect);

// Get all logbook entries for a project
router.get(
  '/projects/:projectId/logbook',
  authorize('student', 'supervisor', 'coordinator'),
  logbookController.getLogbookEntries
);

// Create a new logbook entry (students only)
router.post(
  '/projects/:projectId/logbook',
  authorize('student'),
  validateLogbookEntry,
  logbookController.createLogbookEntry
);

// Update a logbook entry within 24 hours (students only)
router.put(
  '/entries/:entryId',
  authorize('student'),
  validateLogbookEntry,
  logbookController.updateLogbookEntry
);

// Add a comment to a logbook entry (supervisors only)
router.post(
  '/entries/:entryId/comments',
  authorize('supervisor'),
  validateLogbookComment,
  logbookController.addLogbookComment
);

module.exports = router;
