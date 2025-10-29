const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const notificationService = require('./notification.service');

const prisma = new PrismaClient();

// Store for blacklisted tokens (in production, use Redis)
const tokenBlacklist = new Set();

const register = async (userData) => {
  const { email, password, fullName, role } = userData;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }

  // 2. Hash the password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // 3. Create the new user
  const newUser = await prisma.user.create({
    data: {
      email,
      password_hash,
      full_name: fullName,
      role,
    },
  });

  // 4. Return user data (excluding password)
  const { password_hash: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

const login = async (email, password) => {
  // 1. Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // 2. Compare passwords
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // 3. Generate JWT
  const payload = {
    id: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  // 4. Return user data and token
  const { password_hash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

/**
 * Logout user by blacklisting their token
 * @param {string} token - JWT token to blacklist
 */
const logout = (token) => {
  tokenBlacklist.add(token);
};

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is blacklisted
 */
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Refresh access token
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Promise<Object>} New token and user data
 */
const refreshToken = async (userId, role) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const payload = {
    id: user.id,
    role: user.role,
  };

  const newToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const { password_hash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token: newToken };
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Updated user data
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }

  // Hash and update new password
  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { password_hash: newPasswordHash },
  });

  // Notify user of password change
  await notificationService.notifyUser(userId, {
    title: 'Password Changed',
    message: 'Your password has been successfully updated.',
    type: 'success',
  }, {
    to: user.email,
    subject: 'Password Change Confirmation',
    text: 'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
  });

  const { password_hash: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

/**
 * Initiate password reset
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Return void to prevent email enumeration
    return;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Save reset token with expiry
  await prisma.user.update({
    where: { id: user.id },
    data: {
      reset_token: resetTokenHash,
      reset_token_expires: new Date(Date.now() + 3600000), // 1 hour
    },
  });

  // Send reset email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  await notificationService.notifyUser(user.id, {
    title: 'Password Reset Requested',
    message: 'A password reset has been requested for your account.',
    type: 'info',
    actionUrl: resetUrl,
  }, {
    to: user.email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Please click the button below to reset your password:</p>
      <a href="${resetUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `,
  });
};

/**
 * Reset password using reset token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Updated user data
 */
const resetPassword = async (token, newPassword) => {
  // Hash token for comparison
  const resetTokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      reset_token: resetTokenHash,
      reset_token_expires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  // Update password and clear reset token
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires: null,
    },
  });

  // Notify user of password reset
  await notificationService.notifyUser(user.id, {
    title: 'Password Reset Successful',
    message: 'Your password has been successfully reset.',
    type: 'success',
  }, {
    to: user.email,
    subject: 'Password Reset Successful',
    text: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
  });

  const { password_hash: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

module.exports = {
  register,
  login,
  logout,
  isTokenBlacklisted,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
};
