const { body } = require('express-validator');
const { validateRequest } = require('./validation.middleware');

exports.validateLogbookEntry = [
  body('entry')
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Entry must be between 10 and 2000 characters'),

  validateRequest
];

exports.validateLogbookComment = [
  body('comment')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),

  validateRequest
];