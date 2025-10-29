const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('./notification.service');
const bcrypt = require('bcryptjs');

const generateTempPassword = () => {
  // Generate a random 8-character password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const createUser = async (userData) => {
  const { email, fullName, role } = userData;

  // Generate temporary password
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Create user with transaction to ensure both user and role-specific data are created
  const user = await prisma.$transaction(async (tx) => {
    // 1. Create base user
    const newUser = await tx.user.create({
      data: {
        email,
        full_name: fullName,
        role,
        password_hash: passwordHash,
      },
    });

    // 2. Create role-specific record
    if (role === 'student') {
      await tx.student.create({
        data: {
          id: newUser.id,
          registration_number: userData.registrationNumber,
          department: userData.department,
          year_of_study: userData.yearOfStudy || 4,
          academic_status: 'active',
        },
      });
    } else if (role === 'supervisor') {
      await tx.supervisor.create({
        data: {
          id: newUser.id,
          staff_id: userData.staffId,
          department: userData.department,
          title: userData.title || 'Dr.',
          max_capacity: userData.maxCapacity || 5,
        },
      });
    }

    // 3. Send welcome notification with credentials
    await notificationService.notifyNewUserAccount({
      ...newUser,
      password: tempPassword,
    });

    return newUser;
  });

  return user;
};

const getUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      full_name: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
    },
  });
  return users;
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      full_name: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
      student: true, // Include related student data
      supervisor: true, // Include related supervisor data
    },
  });
  return user;
};

const updateUser = async (id, userData) => {
  const { email, fullName, role, isActive } = userData;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      email,
      full_name: fullName,
      role,
      is_active: isActive,
    },
    select: {
      id: true,
      email: true,
      role: true,
      full_name: true,
      is_active: true,
    },
  });

  return updatedUser;
};

const deleteUser = async (id) => {
  await prisma.user.delete({
    where: { id },
  });
};

const getUserProfile = async (id) => {
  // This function reuses the getUserById logic to fetch detailed profile data.
  return getUserById(id);
};

const updateUserProfile = async (id, profileData) => {
  const {
    fullName,
    avatarUrl,
    // Student-specific
    phoneNumber,
    // Supervisor-specific
    specialization,
    officeLocation,
    phoneExtension,
    isAcceptingStudents,
  } = profileData;

  return prisma.$transaction(async (tx) => {
    // 1. Update the base User model if data is provided
    const userDataToUpdate = {};
    if (fullName) userDataToUpdate.full_name = fullName;
    if (avatarUrl) userDataToUpdate.avatar_url = avatarUrl;

    if (Object.keys(userDataToUpdate).length > 0) {
      await tx.user.update({
        where: { id },
        data: userDataToUpdate,
      });
    }

    // 2. Fetch user to check role for role-specific updates
    const user = await tx.user.findUnique({ where: { id } });

    // 3. Update role-specific tables
    if (user.role === 'student') {
      const studentDataToUpdate = {};
      if (phoneNumber) studentDataToUpdate.phone_number = phoneNumber;

      if (Object.keys(studentDataToUpdate).length > 0) {
        await tx.student.update({ where: { id }, data: studentDataToUpdate });
      }
    } else if (user.role === 'supervisor') {
      const supervisorDataToUpdate = {};
      if (specialization) supervisorDataToUpdate.specialization = specialization;
      if (officeLocation) supervisorDataToUpdate.office_location = officeLocation;
      if (phoneExtension) supervisorDataToUpdate.phone_extension = phoneExtension;
      if (isAcceptingStudents !== undefined) {
        supervisorDataToUpdate.is_accepting_students = isAcceptingStudents;
      }

      if (Object.keys(supervisorDataToUpdate).length > 0) {
        await tx.supervisor.update({ where: { id }, data: supervisorDataToUpdate });
      }
    }

    // 4. Fetch and return the fully updated profile
    return getUserById(id);
  });
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
};
