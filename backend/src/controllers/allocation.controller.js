const allocationService = require('../services/allocation.service');
const { ApiError } = require('../utils/errors');
const logger = require('../utils/logger');

const getAllocations = async (req, res, next) => {
  try {
    const allocations = await allocationService.getAllAllocations();
    res.status(200).json(allocations);
  } catch (error) {
    next(new ApiError('Error retrieving allocations', 500));
  }
};

const createAllocation = async (req, res, next) => {
  try {
    const { studentId, projectId, supervisorId } = req.body;

    if (!studentId || !projectId || !supervisorId) {
      return next(new ApiError('Missing required fields: studentId, projectId, supervisorId', 400));
    }

    const allocation = await allocationService.createAllocation({
      studentId,
      projectId,
      supervisorId,
    });

    res.status(201).json({ message: 'Allocation created successfully', allocation });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already allocated')) {
      return next(new ApiError(error.message, 400));
    }
    next(new ApiError('Error creating allocation', 500));
  }
};

const runAllocation = async (req, res, next) => {
  try {
    logger.info('Starting allocation process');
    const coordinatorId = req.user.id; // Assuming coordinator ID is available from authenticated user

    const results = await allocationService.runAllocation(coordinatorId);

    return res.status(200).json({
      success: true,
      data: results,
      message: `Allocation complete: ${results.statistics.totalAllocated} projects allocated`
    });
  } catch (error) {
    logger.error('Allocation process failed:', error);
    next(new ApiError('Allocation process failed', 500));
  }
};

const getAllocationStatus = async (req, res, next) => {
  try {
    const status = await allocationService.getAllocationStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(new ApiError('Failed to retrieve allocation status', 500));
  }
};

const getAllocationResults = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let results;

    if (role === 'coordinator') {
      results = await allocationService.getAllocationResults();
    } else if (role === 'supervisor') {
      // Assuming supervisor ID is the same as user ID
      results = await allocationService.getSupervisorAllocations(id);
    } else if (role === 'student') {
      // Assuming student ID is the same as user ID
      results = await allocationService.getStudentAllocations(id);
    } else {
      throw new ApiError('Unauthorized role', 403);
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    next(new ApiError('Failed to retrieve allocation results', 500));
  }
};

const submitPreferences = async (req, res, next) => {
  try {
    const { preferences } = req.body;
    const studentId = req.user.id;

    if (!preferences || !Array.isArray(preferences)) {
      throw new ApiError('Invalid preferences format', 400);
    }

    const result = await allocationService.submitPreferences(studentId, preferences);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Preferences submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getMyPreferences = async (req, res, next) => {
  try {
    const studentId = req.user.id; // Assuming req.user.id is the studentId
    const preferences = await allocationService.getMyPreferences(studentId);
    res.status(200).json(preferences);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving preferences', error: error.message });
  }
};

const manualAllocate = async (req, res, next) => {
  try {
    const coordinatorId = req.user.id;
    const newAllocation = await allocationService.manualAllocate(req.body, coordinatorId);
    res.status(201).json({ message: 'Manual allocation successful', allocation: newAllocation });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already allocated') || error.message.includes('not available') || error.message.includes('maximum capacity')) {
      return next(new ApiError(error.message, 400));
    }
    next(new ApiError('Error performing manual allocation', 500));
  }
};

const updateAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedAllocation = await allocationService.updateAllocation(id, req.body);
    res.status(200).json(updatedAllocation);
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new ApiError('Allocation not found', 404));
    }
    if (error.message.includes('not found') || error.message.includes('already allocated') || error.message.includes('not available') || error.message.includes('maximum capacity')) {
      return next(new ApiError(error.message, 400));
    }
    next(new ApiError('Error updating allocation', 500));
  }
};

const deleteAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await allocationService.deleteAllocation(id);
    res.status(204).send(); // No Content
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new ApiError('Allocation not found', 404));
    }
    next(new ApiError('Error deleting allocation', 500));
  }
};

module.exports = {
  getAllocations,
  createAllocation,
  runAllocation,
  getAllocationStatus,
  getAllocationResults,
  submitPreferences,
  getMyPreferences,
  manualAllocate,
  updateAllocation,
  deleteAllocation,
};
