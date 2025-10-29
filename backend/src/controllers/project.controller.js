const projectService = require('../services/project.service');

const getProjects = async (req, res) => {
  try {
    const projects = await projectService.getProjects();
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving projects', error: error.message });
  }
};

const createProject = async (req, res) => {
  try {
    const newProject = await projectService.createProject(req.body, req.user.id);
    res.status(201).json({ message: 'Project created successfully', project: newProject });
  } catch (error) {
    if (error.message.includes('Supervisor not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating project', error: error.message });
  }
};

const importProjectsFromWord = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload a Word (.docx) file.' });
    }

    const results = await projectService.importProjectsFromWord(req.file.buffer, req.user.id);

    res.status(201).json({
      message: `Successfully imported ${results.createdCount} projects. ${results.failedCount > 0 ? `(${results.failedCount} failed)` : ''}`,
      data: results,
    });
  } catch (error) {
    // Handle specific errors from the service
    if (error.message.includes('Supervisor with email') || error.message.includes('Missing required fields')) {
      return res.status(400).json({ message: 'Import failed due to invalid data in the Word file.', details: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred during the import process.', error: error.message });
  }
};

const getAvailableProjects = async (req, res) => {
  try {
    const availableProjects = await projectService.getAvailableProjects();
    res.status(200).json(availableProjects);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving available projects', error: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving project', error: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProject = await projectService.updateProject(id, req.body);
    res.status(200).json(updatedProject);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (error.message.includes('Supervisor not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await projectService.deleteProject(id);
    res.status(204).send(); // No Content
  } catch (error) {
    // Prisma throws a specific error code if the record to delete is not found.
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Error deleting project', error: error.message });
  }
};

const proposeProject = async (req, res) => {
  try {
    const newProject = await projectService.proposeProject(req.body, req.user.id);
    res.status(201).json({ message: 'Project proposal submitted successfully', project: newProject });
  } catch (error) {
    if (error.message.includes('Proposed supervisor not found')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error proposing project', error: error.message });
  }
};

const approveProject = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedProject = await projectService.approveProject(id);
    res.status(200).json({ message: 'Project approved successfully', project: approvedProject });
  } catch (error) {
    if (error.message.includes('Project not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Project is already approved')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error approving project', error: error.message });
  }
};

const rejectProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const rejectedProject = await projectService.rejectProject(id, reason);
    res.status(200).json({ message: 'Project rejected successfully', project: rejectedProject });
  } catch (error) {
    if (error.message.includes('Project not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Project is already rejected')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error rejecting project', error: error.message });
  }
};

const getMyAllocatedProjects = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;
    const allocatedProjects = await projectService.getMyAllocatedProjects(userId, userRole);
    res.status(200).json(allocatedProjects);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving allocated projects', error: error.message });
  }
};

module.exports = {
  getProjects,
  createProject,
  importProjectsFromWord,
  getAvailableProjects,
  getProjectById,
  updateProject,
  deleteProject,
  proposeProject,
  approveProject,
  rejectProject,
  getMyAllocatedProjects,
};
