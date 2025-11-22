const userService = require('../services/user.service');

const ALLOWED_ROLES = ['student', 'supervisor', 'coordinator'];

const validateCreateUserPayload = (payload) => {
  const errors = [];
  const { email, fullName, role } = payload;

  if (!email) {
    errors.push('Email is required');
  }

  if (!fullName) {
    errors.push('Full name is required');
  }

  if (!role) {
    errors.push('Role is required');
  } else if (!ALLOWED_ROLES.includes(role)) {
    errors.push(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  if (role === 'student') {
    if (!payload.registrationNumber) {
      errors.push('Registration number is required for student accounts');
    }
    if (!payload.department) {
      errors.push('Department is required for student accounts');
    }
  }

  if (role === 'supervisor') {
    if (!payload.staffId) {
      errors.push('Staff ID is required for supervisor accounts');
    }
    if (!payload.department) {
      errors.push('Department is required for supervisor accounts');
    }
  }

  return errors;
};

const createUser = async (req, res) => {
  try {
    const validationErrors = validateCreateUserPayload(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: validationErrors[0],
        errors: validationErrors,
      });
    }

    const { user, tempPassword } = await userService.createUser(req.body);

    return res.status(201).json({
      message: 'User created successfully',
      user,
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    return res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users', error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(id, req.body);
    res.status(200).json(updatedUser);
  } catch (error) {
    // Prisma throws a specific error code if the record to update is not found.
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(204).send(); // No Content
  } catch (error) {
    // Prisma throws a specific error code if the record to delete is not found.
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    // The user ID is retrieved from the authenticated user's token
    const userProfile = await userService.getUserProfile(req.user.id);

    if (!userProfile) {
      // This case is unlikely if the user is authenticated but good for robustness
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.status(200).json(userProfile);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user profile', error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const updatedProfile = await userService.updateUserProfile(req.user.id, req.body);
    res.status(200).json(updatedProfile);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile', error: error.message });
  }
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
