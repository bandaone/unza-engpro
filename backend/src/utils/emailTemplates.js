const emailTemplates = {
  // Project Allocation Template
  projectAllocation: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .project-details { margin: 20px 0; padding: 15px; border-left: 4px solid #0066cc; background-color: white; }
        .button { display: inline-block; padding: 10px 20px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Project Allocation Notification</h2>
        </div>
        <div class="content">
          <p>Dear ${data.student.full_name},</p>
          <p>You have been allocated to the following project:</p>
          
          <div class="project-details">
            <h3>${data.project.title}</h3>
            <p><strong>Supervisor:</strong> ${data.supervisor.title} ${data.supervisor.full_name}</p>
            <p><strong>Description:</strong> ${data.project.description}</p>
          </div>

          <p>Please log in to the system to:</p>
          <ul>
            <li>Review project details</li>
            <li>Contact your supervisor</li>
            <li>Start your project logbook</li>
          </ul>

          <p>
            <a href="${process.env.FRONTEND_URL}/projects/my-allocation" class="button">
              View Project Details
            </a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from the UNZA Engineering Project Management System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Logbook Comment Template
  logbookComment: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .comment { margin: 20px 0; padding: 15px; border-left: 4px solid #0066cc; background-color: white; }
        .button { display: inline-block; padding: 10px 20px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Logbook Comment</h2>
        </div>
        <div class="content">
          <p>Dear ${data.student.full_name},</p>
          <p>Your supervisor has added a new comment to your logbook entry from ${new Date(data.logbookEntry.entry_date).toLocaleDateString()}.</p>
          
          <div class="comment">
            <p><strong>Comment from ${data.supervisor.title} ${data.supervisor.full_name}:</strong></p>
            <p>${data.comment.comment_text}</p>
          </div>

          <p>
            <a href="${process.env.FRONTEND_URL}/logbook/entries/${data.logbookEntry.id}" class="button">
              View Logbook Entry
            </a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from the UNZA Engineering Project Management System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Project Submission Reminder Template
  submissionReminder: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff6b6b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .deadline { margin: 20px 0; padding: 15px; border-left: 4px solid #ff6b6b; background-color: white; }
        .button { display: inline-block; padding: 10px 20px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Project Submission Reminder</h2>
        </div>
        <div class="content">
          <p>Dear ${data.student.full_name},</p>
          <p>This is a reminder about your upcoming project submission deadline.</p>
          
          <div class="deadline">
            <h3>${data.project.title}</h3>
            <p><strong>Deadline:</strong> ${new Date(data.deadline).toLocaleDateString()}</p>
            <p><strong>Time Remaining:</strong> ${data.timeRemaining}</p>
          </div>

          <p>Please ensure to:</p>
          <ul>
            <li>Complete all pending tasks</li>
            <li>Update your logbook</li>
            <li>Review submission requirements</li>
            <li>Submit your work before the deadline</li>
          </ul>

          <p>
            <a href="${process.env.FRONTEND_URL}/projects/${data.project.id}/submit" class="button">
              Go to Project Submission
            </a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from the UNZA Engineering Project Management System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
};

module.exports = emailTemplates;