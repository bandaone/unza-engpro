const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

// Email sending function
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();
    
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      text,
      html,
    });

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
const templates = {
  // Welcome email for new users
  welcome: (name, role, password) => ({
    subject: 'Welcome to UNZA EngPro - Account Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Welcome to UNZA EngPro</h2>
        <p>Dear ${name},</p>
        <p>Welcome to the UNZA Engineering Projects Management System. Your account has been created successfully as a ${role}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Your Account Credentials:</strong></p>
          <p>Email: <strong>${email}</strong></p>
          <p>Password: <strong>${password}</strong></p>
          <p style="color: #d32f2f;">Important: Please keep these credentials safe. This is your permanent password for accessing the system.</p>
        </div>
        <p>You can now access your dashboard and start managing your projects:</p>
        <p>
          <a href="${process.env.FRONTEND_URL}" 
             style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Access Dashboard
          </a>
        </p>
        <p>If you have any issues accessing your account, please contact your system administrator.</p>
        <p>Best regards,<br>UNZA EngPro Team</p>
      </div>
    `,
  }),

  // Password reset email
  passwordReset: (name, resetToken) => ({
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
             style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 week .</p>
        <p>If you didn't request this change, please ignore this email.</p>
        <p>Best regards,<br>UNZA EngPro Team</p>
      </div>
    `,
  }),

  // Project assignment notification
  projectAssignment: (studentName, projectTitle, supervisorName) => ({
    subject: 'New Project Assignment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Project Assignment Notification</h2>
        <p>Dear ${studentName},</p>
        <p>You have been assigned to a new project:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Project:</strong> ${projectTitle}</p>
          <p><strong>Supervisor:</strong> ${supervisorName}</p>
        </div>
        <p>Please log in to your dashboard to view the project details and requirements.</p>
        <p>Best regards,<br>UNZA EngPro Team</p>
      </div>
    `,
  }),

  // Logbook feedback notification
  logbookFeedback: (studentName, entryDate, feedback) => ({
    subject: 'New Logbook Feedback',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Logbook Feedback</h2>
        <p>Dear ${studentName},</p>
        <p>You have received feedback on your logbook entry from ${entryDate}:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p>${feedback}</p>
        </div>
        <p>Please review the feedback and make any necessary updates to your work.</p>
        <p>Best regards,<br>UNZA EngPro Team</p>
      </div>
    `,
  }),

  // Group formation notification
  groupFormation: (memberName, groupName, members) => ({
    subject: 'Group Formation Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Group Formation Update</h2>
        <p>Dear ${memberName},</p>
        <p>You are now part of group: <strong>${groupName}</strong></p>
        <p>Group Members:</p>
        <ul>
          ${members.map(member => `<li>${member.full_name}</li>`).join('')}
        </ul>
        <p>You can now collaborate with your team members through the platform.</p>
        <p>Best regards,<br>UNZA EngPro Team</p>
      </div>
    `,
  }),
};

module.exports = {
  sendEmail,
  testEmailConfig,
  templates,
};