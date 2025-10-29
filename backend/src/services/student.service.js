const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

module.exports = {
  getStudents,
  getStudentById,
  updateStudent,
  importStudentsFromCsv,
};
