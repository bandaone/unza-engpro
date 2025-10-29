const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const wordUpload = require('../middleware/wordUpload.middleware'); // Changed from pdfUpload

// All project routes require authentication
router.use(protect);

// GET /api/projects - Accessible by all authenticated users
router.get('/', projectController.getProjects);

// POST /api/projects - Only Coordinators and Supervisors can create projects
router.post('/', authorize('coordinator', 'supervisor'), projectController.createProject);

// POST /api/projects/import-word - Only Coordinators can import projects from Word
router.post('/import-word', authorize('coordinator'), wordUpload.single('file'), projectController.importProjectsFromWord); // Changed route and controller

// GET /api/projects/available - Accessible by Students and Supervisors
router.get('/available', authorize('student', 'supervisor'), projectController.getAvailableProjects);

// GET /api/projects/:id - Accessible by all authenticated users
router.get('/:id', projectController.getProjectById);

// PUT /api/projects/:id - Only Coordinators and the project's Supervisor can update
router.put('/:id', authorize('coordinator', 'supervisor'), projectController.updateProject);

// DELETE /api/projects/:id - Only Coordinators can delete projects
router.delete('/:id', authorize('coordinator'), projectController.deleteProject);

// POST /api/projects/propose - Only Students can propose projects
router.post('/propose', authorize('student'), projectController.proposeProject);

// POST /api/projects/:id/approve - Only Coordinators can approve projects
router.post('/:id/approve', authorize('coordinator'), projectController.approveProject);

// POST /api/projects/:id/reject - Only Coordinators can reject projects
router.post('/:id/reject', authorize('coordinator'), projectController.rejectProject);

// GET /api/projects/me/allocated - Accessible by Students and Supervisors
router.get('/me/allocated', authorize('student', 'supervisor'), projectController.getMyAllocatedProjects);

module.exports = router;
