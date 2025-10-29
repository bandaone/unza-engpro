const groupService = require('../services/group.service');

const getGroups = async (req, res) => {
  try {
    const groups = await groupService.getGroups();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving groups', error: error.message });
  }
};

const pairStudents = async (req, res) => {
  try {
    const { studentIds, pairingMode } = req.body;
    const coordinatorId = req.user.id; // Assuming coordinator ID is available from authenticated user

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required.' });
    }
    if (!pairingMode) {
      return res.status(400).json({ message: 'pairingMode is required.' });
    }

    const createdGroups = await groupService.pairStudents(studentIds, pairingMode, coordinatorId);
    res.status(201).json({ message: 'Students paired successfully', groups: createdGroups });
  } catch (error) {
    res.status(500).json({ message: 'Error pairing students', error: error.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await groupService.getGroupById(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving group', error: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedGroup = await groupService.updateGroup(id, req.body);
    res.status(200).json(updatedGroup);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(500).json({ message: 'Error updating group', error: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    await groupService.deleteGroup(id);
    res.status(204).send(); // No Content
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(500).json({ message: 'Error deleting group', error: error.message });
  }
};

const requestGroupSplit = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { reason, proposedProjectId } = req.body;
    const studentId = req.user.id; // Student making the request

    if (!reason) {
      return res.status(400).json({ message: 'Reason for split request is required.' });
    }

    const splitRequest = await groupService.requestGroupSplit(groupId, studentId, reason, proposedProjectId);
    res.status(201).json({ message: 'Group split request submitted successfully', splitRequest });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('not a member')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error submitting group split request', error: error.message });
  }
};

const approveGroupSplit = async (req, res) => {
  try {
    const { id: splitRequestId } = req.params;
    const coordinatorId = req.user.id;

    const result = await groupService.approveGroupSplit(splitRequestId, coordinatorId);
    res.status(200).json({ message: 'Group split request approved successfully', ...result });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('not in a pending state')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error approving group split request', error: error.message });
  }
};

const rejectGroupSplit = async (req, res) => {
  try {
    const { id: splitRequestId } = req.params;
    const { reviewNotes } = req.body;
    const coordinatorId = req.user.id;

    if (!reviewNotes) {
      return res.status(400).json({ message: 'Review notes are required for rejecting a split request.' });
    }

    const rejectedSplitRequest = await groupService.rejectGroupSplit(splitRequestId, coordinatorId, reviewNotes);
    res.status(200).json({ message: 'Group split request rejected successfully', splitRequest: rejectedSplitRequest });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('not in a pending state')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error rejecting group split request', error: error.message });
  }
};

module.exports = {
  getGroups,
  pairStudents,
  getGroupById,
  updateGroup,
  deleteGroup,
  requestGroupSplit,
  approveGroupSplit,
  rejectGroupSplit,
};
