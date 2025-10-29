const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const getSupervisors = async () => {
  const supervisors = await prisma.supervisor.findMany({
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
  return supervisors;
};

const createSupervisor = async (supervisorData) => {
  const {
    email,
    full_name,
    department,
    title,
    max_capacity,
    specialization,
    office_location,
    phone_extension,
    is_accepting_students,
  } = supervisorData;

  return prisma.$transaction(async (tx) => {
    // 1. Check if user with this email already exists
    const existingUser = await tx.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('A user with this email already exists.');
    }

    // 2. Generate a random temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    // 3. Create the User record
    const newUser = await tx.user.create({
      data: {
        email,
        password_hash,
        full_name,
        role: 'supervisor',
      },
    });

    // 4. Create the Supervisor record linked to the new user
    const newSupervisor = await tx.supervisor.create({
      data: {
        id: newUser.id, // Link to the user's ID
        staff_id: crypto.randomBytes(4).toString('hex').toUpperCase(), // Generate a simple staff ID
        department,
        title,
        max_capacity: max_capacity || 5,
        specialization,
        office_location,
        phone_extension,
        is_accepting_students: is_accepting_students !== undefined ? is_accepting_students : true,
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

    // TODO: In a real application, you would email the tempPassword to the supervisor.
    console.log(`Created supervisor ${email} with temp password: ${tempPassword}`);

    return newSupervisor;
  });
};

const getSupervisorById = async (id) => {
  const supervisor = await prisma.supervisor.findUnique({
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
  return supervisor;
};

const updateSupervisor = async (id, supervisorData) => {
  const {
    // User fields
    full_name,
    email,
    is_active,
    // Supervisor fields
    department,
    title,
    max_capacity,
    specialization,
    office_location,
    phone_extension,
    is_accepting_students,
  } = supervisorData;

  return prisma.$transaction(async (tx) => {
    // 1. Update the base User model if relevant data is provided
    const userDataToUpdate = {};
    if (full_name) userDataToUpdate.full_name = full_name;
    if (email) userDataToUpdate.email = email;
    if (is_active !== undefined) userDataToUpdate.is_active = is_active;

    if (Object.keys(userDataToUpdate).length > 0) {
      await tx.user.update({
        where: { id },
        data: userDataToUpdate,
      });
    }

    // 2. Update the Supervisor model if relevant data is provided
    const supervisorDataToUpdate = {};
    if (department) supervisorDataToUpdate.department = department;
    if (title) supervisorDataToUpdate.title = title;
    if (max_capacity !== undefined) supervisorDataToUpdate.max_capacity = max_capacity;
    if (specialization) supervisorDataToUpdate.specialization = specialization;
    if (office_location) supervisorDataToUpdate.office_location = office_location;
    if (phone_extension) supervisorDataToUpdate.phone_extension = phone_extension;
    if (is_accepting_students !== undefined) {
      supervisorDataToUpdate.is_accepting_students = is_accepting_students;
    }

    if (Object.keys(supervisorDataToUpdate).length > 0) {
      await tx.supervisor.update({
        where: { id },
        data: supervisorDataToUpdate,
      });
    }

    // 3. Fetch and return the fully updated supervisor profile
    return getSupervisorById(id);
  });
};

module.exports = {
  getSupervisors,
  createSupervisor,
  getSupervisorById,
  updateSupervisor,
};
