const projectProposalService = require('../services/projectProposal.service');
const { ApiError } = require('../utils/errors');
const logger = require('../utils/logger');

// @desc    Submit new project proposal
// @route   POST /api/projects/propose
// @access  Private (Students)
exports.submitProposal = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError('Project proposal document is required', 400);
    }

    const proposalData = JSON.parse(req.body.data || '{}');
    const proposal = await projectProposalService.createProposal(
      proposalData,
      req.file,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: proposal,
      message: 'Project proposal submitted successfully'
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return next(new ApiError('Invalid proposal data format', 400));
    }
    next(error);
  }
};

// @desc    Get proposal by ID
// @route   GET /api/projects/proposals/:id
// @access  Private
exports.getProposal = async (req, res, next) => {
  try {
    const proposal = await projectProposalService.getProposal(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update proposal status
// @route   PUT /api/projects/proposals/:id/status
// @access  Private (Supervisors & Coordinators)
exports.updateProposalStatus = async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body;
    const proposal = await projectProposalService.updateProposalStatus(
      req.params.id,
      status,
      reviewNotes,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: proposal,
      message: `Project proposal ${status} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get proposals for review
// @route   GET /api/projects/proposals/review
// @access  Private (Supervisors & Coordinators)
exports.getProposalsForReview = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      supervisorId: req.user.role === 'supervisor' ? req.user.id : req.query.supervisorId,
      category: req.query.category
    };

    const proposals = await projectProposalService.getProposalsForReview(filters);

    res.status(200).json({
      success: true,
      data: proposals
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download proposal document
// @route   GET /api/projects/proposals/:id/document
// @access  Private
exports.downloadProposalDocument = async (req, res, next) => {
  try {
    const document = await projectProposalService.getProposalDocument(req.params.id);
    
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.send(document.content);
  } catch (error) {
    next(error);
  }
};