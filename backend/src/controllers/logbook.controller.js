const logbookService = require('../services/logbook.service');
const { StatusCodes } = require('http-status-codes');

// 🟢 Get all logbook entries
const getLogbookEntries = async (req, res) => {
  try {
    const { projectId } = req.params;
    const entries = await logbookService.getLogbookEntries(projectId, req.user.id, req.user.role);
    res.status(StatusCodes.OK).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: error.message,
    });
  }
};

// 🟢 Create a new logbook entry
const createLogbookEntry = async (req, res) => {
  try {
    const { projectId } = req.params;
    const entry = await logbookService.createEntry(projectId, req.user.id, req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: error.message,
    });
  }
};

// 🟢 Update an existing logbook entry
const updateLogbookEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await logbookService.updateEntry(entryId, req.user.id, req.body);
    res.status(StatusCodes.OK).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: error.message,
    });
  }
};

// 🟢 Delete a logbook entry (was broken before)
const deleteLogbookEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { id: userId, role: userRole } = req.user;

    await logbookService.deleteLogbookEntry(entryId, userId, userRole);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error deleting logbook entry',
      error: error.message,
    });
  }
};

// 🟢 Add a comment to a logbook entry
const addLogbookComment = async (req, res) => {
  try {
    const { entryId } = req.params;
    const supervisorId = req.user.id;
    const { commentText } = req.body;

    if (!commentText) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Comment text is required.' });
    }

    const newComment = await logbookService.addLogbookComment(entryId, supervisorId, commentText);
    res.status(StatusCodes.CREATED).json({
      message: 'Comment added successfully',
      comment: newComment,
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('not assigned')) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error adding comment',
      error: error.message,
    });
  }
};

// 🟢 Get comments for a logbook entry
const getLogbookComments = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { id: userId, role: userRole } = req.user;
    const comments = await logbookService.getLogbookComments(entryId, userId, userRole);
    res.status(StatusCodes.OK).json(comments);
  } catch (error) {
    if (error.message.includes('Not authorized')) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error retrieving logbook comments',
      error: error.message,
    });
  }
};

// 🟢 Update a comment
const updateLogbookComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const supervisorId = req.user.id;
    const { commentText } = req.body;

    if (!commentText) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Comment text is required.' });
    }

    const updatedComment = await logbookService.updateLogbookComment(commentId, supervisorId, commentText);
    res.status(StatusCodes.OK).json(updatedComment);
  } catch (error) {
    if (error.message.includes('Not authorized')) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error updating comment',
      error: error.message,
    });
  }
};

// 🟢 Delete a comment
const deleteLogbookComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { id: userId, role: userRole } = req.user;
    await logbookService.deleteLogbookComment(commentId, userId, userRole);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    if (error.message.includes('Not authorized')) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error deleting comment',
      error: error.message,
    });
  }
};

module.exports = {
  getLogbookEntries,
  createLogbookEntry,
  updateLogbookEntry,
  deleteLogbookEntry,
  addLogbookComment,
  getLogbookComments,
  updateLogbookComment,
  deleteLogbookComment,
};
