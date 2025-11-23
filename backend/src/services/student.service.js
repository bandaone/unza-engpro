const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const createStudent = async (data) => {
  const { full_name, email, registration_number, password } = data;

  // Check if student already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });
  if (existingUser) {
    throw new Error('Email already exists');
  }

  const existingStudent = await prisma.student.findUnique({
    where: { registration_number }
  });
  if (existingStudent) {
    throw new Error('Registration number already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user and student in transaction
  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        full_name,
        email,
        password: hashedPassword,
        role: 'student',
        is_active: true,
      },
    });

    return await tx.student.create({
      data: {
        user_id: user.id,
        registration_number,
      },
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
            is_active: true,
          },
        },
      },
    });
  });

  return student;
};

const getStudents = async () => {
  const students = await prisma.student.findMany({
    include: {
      user: {
        select: {
          full_name: true,
          email: true,
          is_active: true,
        },
      },
    },
  });
  return students;
};

const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          full_name: true,
          email: true,
          is_active: true,
        },
      },
    },
  });
  return student;
};

const updateStudent = async (id, studentData) => {
  const {
    // User fields
    fullName,
    email,
    isActive,
    // Student fields
    registration_number,
    year_of_study,
    department,
    phone_number,
    gpa,
    academic_status,
  } = studentData;

  return prisma.$transaction(async (tx) => {
    // ... (update logic as before)
  });
};

const importStudentsFromCsv = async (fileBuffer) => {
  const studentsData = fileBuffer.toString('utf-8').split('\n').slice(1); // Skip header

  const results = await prisma.$transaction(async (tx) => {
    let createdCount = 0;

    for (const row of studentsData) {
      if (!row) continue; // Skip empty lines

      const [registration_number, full_name, email, department, gpa] = row.split(',').map(s => s.trim());

      if (!registration_number || !full_name || !email) {
        throw new Error(`Invalid data in row: ${row}. Skipping.`);
      }

      // Generate a random temporary password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(tempPassword, salt);

      // Create the user and student record
      const newUser = await tx.user.create({
        data: {
          email,
          password_hash,
          full_name,
          role: 'student',
          student: {
            create: {
              id: crypto.randomUUID(), // Explicitly set a UUID for the student record
              registration_number,
              department,
              gpa: gpa ? parseFloat(gpa) : null,
              academic_status: 'active', // Default status
            },
          },
        },
        include: { student: true },
      });

      // TODO: In a real application, you would email the tempPassword to the user.
      // For now, we can log it for testing purposes.
      console.log(`Created user ${email} with temp password: ${tempPassword}`);

      createdCount++;
    }

    return { createdCount };
  });

  return results;
};

const deleteStudent = async (id) => {
  return await prisma.$transaction(async (tx) => {
    // Get the student first to find the user_id
    const student = await tx.student.findUnique({
      where: { id }
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Delete the student record
    await tx.student.delete({
      where: { id }
    });

    // Delete the associated user record
    await tx.user.delete({
      where: { id: student.user_id }
    });

    return { message: 'Student deleted successfully' };
  });
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  importStudentsFromCsv,
  deleteStudent,
};
