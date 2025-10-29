const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { handleWordUpload } = require('../middleware/wordUpload.middleware');
const {
  validateProposalSubmission,
  validateProposalStatus,
  validateProposalFilters
} = require('../middleware/projectProposal.validation');
const {
  submitProposal,
  updateProposalStatus,
  getProposals,
  getProposalById
} = require('../controllers/projectProposal.controller');

// Submit a new project proposal with Word document
router.post('/', 
  authenticate, 
  handleWordUpload, 
  validateProposalSubmission, 
  submitProposal
);

// Update proposal status (approve/reject)
router.patch('/:id/status',
  authenticate,
  validateProposalStatus,
  updateProposalStatus
);

// Get all proposals with optional filters
router.get('/',
  authenticate,
  validateProposalFilters,
  getProposals
);

// Get proposal by ID
router.get('/:id',
  authenticate,
  getProposalById
);

module.exports = router;