const userService = require('../services/user.service');

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
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
};
