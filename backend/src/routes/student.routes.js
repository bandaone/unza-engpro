const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// All student management routes are protected and restricted to coordinators
router.use(protect, authorize('coordinator'));

// GET /api/students
router.get('/', studentController.getStudents);

// POST /api/students - Create individual student
router.post('/', studentController.createStudent);

// POST /api/students/import-csv
router.post('/import-csv', upload.single('file'), studentController.importStudentsFromCsv);

// GET /api/students/:id
router.get('/:id', studentController.getStudentById);

// PUT /api/students/:id
router.put('/:id', studentController.updateStudent);

module.exports = router;
