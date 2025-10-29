const { body, param, query } = require('express-validator');
const { validateRequest } = require('./validation.middleware');

exports.validateCreateGroup = [
  body('studentIds')
    .isArray({ min: 1 })
    .withMessage('At least one student ID is required'),
  body('studentIds.*')
    .isUUID()
    .withMessage('Invalid student ID format'),
  body('groupName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Group name must be between 3 and 100 characters'),
  validateRequest
];

exports.validatePairStudents = [
  body('pairingMode')
    .isIn(['individual', 'pairs', 'mixed'])
    .withMessage('Invalid pairing mode. Must be individual, pairs, or mixed'),
  body('departmentId')
    .optional()
    .isUUID()
    .withMessage('Invalid department ID format'),
  validateRequest
];

exports.validateGroupId = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID format'),
  validateRequest
];

exports.validateSplitRequest = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID format'),
  body('reason')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Split reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
  validateRequest
];

exports.validateProcessSplit = [
  param('id')
    .isUUID()
    .withMessage('Invalid split request ID format'),
  param('action')
    .isIn(['approve', 'reject'])
    .withMessage('Invalid action. Must be approve or reject'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  validateRequest
];

exports.validateUpdateGroup = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID format'),
  body('groupName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Group name must be between 3 and 100 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
  validateRequest
];

exports.validateGroupFilters = [
  query('active')
    .optional()
    .isBoolean()
    .withMessage('active must be a boolean value'),
  query('departmentId')
    .optional()
    .isUUID()
    .withMessage('Invalid department ID format'),
  validateRequest
];