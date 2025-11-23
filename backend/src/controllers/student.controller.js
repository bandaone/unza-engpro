const studentService = require('../services/student.service');

const getStudents = async (req, res) => {
  try {
    const students = await studentService.getStudents();
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving students', error: error.message });
  }
};

const createStudent = async (req, res) => {
  try {
    const { full_name, email, registration_number, password } = req.body;

    if (!full_name || !email || !registration_number || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['full_name', 'email', 'registration_number', 'password']
      });
    }

    const student = await studentService.createStudent({
      full_name,
      email,
      registration_number,
      password,
    });

    res.status(201).json({ message: 'Student created successfully', student });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        message: 'Student with this email or registration number already exists'
      });
    }
    res.status(500).json({ message: 'Error creating student', error: error.message });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving student', error: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStudent = await studentService.updateStudent(id, req.body);
    res.status(200).json(updatedStudent);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
};

const importStudentsFromCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload a CSV file.' });
    }

    const results = await studentService.importStudentsFromCsv(req.file.buffer);

    res.status(201).json({
      message: `Successfully imported ${results.createdCount} students.`,
      data: results,
    });
  } catch (error) {
    // Prisma unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        message: 'Import failed due to duplicate data.',
        details: `An account with one of the provided emails or registration numbers already exists.`
      });
    }
    // Custom error thrown from the service for invalid row data
    if (error.message.includes('Invalid data in row')) {
        return res.status(400).json({ message: 'Import failed due to invalid data in the CSV file.', details: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred during the import process.', error: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await studentService.deleteStudent(id);
    res.status(200).json({ message: 'Student deleted successfully', student: deletedStudent });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
};

module.exports = {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  importStudentsFromCsv,
  deleteStudent,
};
