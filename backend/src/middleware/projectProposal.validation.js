const { body, param, query } = require('express-validator');
const { validateRequest } = require('./validation.middleware');

exports.validateProposalSubmission = [
  body('data')
    .isString()
    .custom((value) => {
      try {
        const data = JSON.parse(value);
        if (!data.supervisorId) {
          throw new Error('Supervisor ID is required');
        }
        return true;
      } catch (error) {
        throw new Error('Invalid proposal data format');
      }
    }),
  validateRequest
];

exports.validateProposalStatus = [
  param('id')
    .isUUID()
    .withMessage('Invalid proposal ID'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Invalid status. Must be either approved or rejected'),
  body('reviewNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review notes must not exceed 1000 characters'),
  validateRequest
];

exports.validateProposalFilters = [
  query('status')
    .optional()
    .isIn(['pending_approval', 'approved', 'rejected'])
    .withMessage('Invalid status filter'),
  query('supervisorId')
    .optional()
    .isUUID()
    .withMessage('Invalid supervisor ID format'),
  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid category filter'),
  validateRequest
];