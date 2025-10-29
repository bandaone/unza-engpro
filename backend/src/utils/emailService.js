const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Utility function to send emails
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to UNZA EngPro',
    text: `Welcome ${name} to UNZA EngPro system!`,
    html: `
      <h2>Welcome to UNZA EngPro</h2>
      <p>Dear ${name},</p>
      <p>Welcome to the UNZA Engineering Projects Management System. Your account has been successfully created.</p>
      <p>You can now log in to access your dashboard and manage your projects.</p>
      <p>Best regards,<br>UNZA EngPro Team</p>
    `,
  }),
  
  passwordReset: (resetToken) => ({
    subject: 'Password Reset Request',
    text: `Click this link to reset your password: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <p>
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
           style="padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>UNZA EngPro Team</p>
    `,
  }),

  groupAssignment: (studentName, groupName) => ({
    subject: 'Group Assignment Notification',
    text: `You have been assigned to group: ${groupName}`,
    html: `
      <h2>Group Assignment Notification</h2>
      <p>Dear ${studentName},</p>
      <p>You have been successfully assigned to group: <strong>${groupName}</strong></p>
      <p>You can now access your group's dashboard to view your project and team members.</p>
      <p>Best regards,<br>UNZA EngPro Team</p>
    `,
  }),

  projectUpdate: (projectName, updateType, details) => ({
    subject: `Project Update: ${projectName}`,
    text: `${updateType} update for project: ${projectName}\n${details}`,
    html: `
      <h2>Project Update: ${projectName}</h2>
      <p><strong>${updateType}</strong></p>
      <p>${details}</p>
      <p>Best regards,<br>UNZA EngPro Team</p>
    `,
  }),
};

module.exports = {
  sendEmail,
  emailTemplates,
};