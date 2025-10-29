const authService = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    res.status(200).json({ message: 'Login successful', user, token });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const logout = (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    authService.logout(token);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error during logout', error: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { user, token } = await authService.refreshToken(userId, role);
    res.status(200).json({ message: 'Token refreshed successfully', user, token });
  } catch (error) {
    res.status(401).json({ message: 'Error refreshing token', error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    const updatedUser = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    res.status(200).json({ 
      message: 'Password changed successfully',
      user: updatedUser
    });
  } catch (error) {
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Error changing password',
      error: error.message
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    res.status(200).json({ 
      message: 'If a user with that email exists, a password reset link will be sent.' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    // Still return success to prevent email enumeration
    res.status(200).json({ 
      message: 'If a user with that email exists, a password reset link will be sent.' 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: 'Reset token and new password are required' 
      });
    }

    const updatedUser = await authService.resetPassword(token, newPassword);

    res.status(200).json({ 
      message: 'Password reset successful',
      user: updatedUser
    });
  } catch (error) {
    if (error.message === 'Invalid or expired reset token') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Error resetting password',
      error: error.message 
    });
  }
};

const getMe = (req, res) => {
  res.status(200).json(req.user);
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
};
