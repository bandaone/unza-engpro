const supervisorService = require('../services/supervisor.service');

const getSupervisors = async (req, res) => {
  try {
    const supervisors = await supervisorService.getSupervisors();
    res.status(200).json(supervisors);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving supervisors', error: error.message });
  }
};

const createSupervisor = async (req, res) => {
  try {
    const newSupervisor = await supervisorService.createSupervisor(req.body);
    res.status(201).json({ message: 'Supervisor created successfully', supervisor: newSupervisor });
  } catch (error) {
    if (error.message.includes('A user with this email already exists.')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating supervisor', error: error.message });
  }
};

const getSupervisorById = async (req, res) => {
  try {
    const { id } = req.params;
    const supervisor = await supervisorService.getSupervisorById(id);

    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }

    res.status(200).json(supervisor);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving supervisor', error: error.message });
  }
};

const updateSupervisor = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSupervisor = await supervisorService.updateSupervisor(id, req.body);
    res.status(200).json(updatedSupervisor);
  } catch (error) {
    // Prisma throws a specific error code if the record to update is not found.
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Supervisor not found' });
    }
    // Handle case where email might already exist for another user
    if (error.message.includes('A user with this email already exists.')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating supervisor', error: error.message });
  }
};

module.exports = {
  getSupervisors,
  createSupervisor,
  getSupervisorById,
  updateSupervisor,
};
