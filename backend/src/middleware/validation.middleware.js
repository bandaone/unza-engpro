const { body, param, validationResult } = require('express-validator');
const { ApiError } = require('../utils/errors');

exports.validateAllocationRequest = [
  // For preference submission
  body('preferences')
    .optional()
    .isArray()
    .withMessage('Preferences must be an array')
    .custom((preferences) => {
      if (preferences.length === 0) {
        throw new Error('At least one preference is required');
      }
      
      // Check each preference object
      preferences.forEach((pref, index) => {
        if (!pref.projectId || !pref.preferenceRank) {
          throw new Error(`Invalid preference at index ${index}`);
        }
        if (typeof pref.preferenceRank !== 'number' || pref.preferenceRank < 1) {
          throw new Error(`Invalid rank at index ${index}`);
        }
      });
      
      // Check for duplicate ranks
      const ranks = preferences.map(p => p.preferenceRank);
      if (new Set(ranks).size !== ranks.length) {
        throw new Error('Duplicate preference ranks are not allowed');
      }
      
      return true;
    }),

  // For manual allocation
  body('projectId')
    .optional()
    .isUUID()
    .withMessage('Invalid project ID'),
    
  body('studentId')
    .optional()
    .isUUID()
    .withMessage('Invalid student ID'),
    
  body('supervisorId')
    .optional()
    .isUUID()
    .withMessage('Invalid supervisor ID'),

  // Validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      next(new ApiError(errorMessages[0], 400));
    }
    next();
  }
];

exports.validateAllocationUpdate = [
  param('id')
    .isUUID()
    .withMessage('Invalid allocation ID'),
    
  body('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Invalid allocation status'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      next(new ApiError(errorMessages[0], 400));
    }
    next();
  }
];