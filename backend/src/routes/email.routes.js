const { Router } = require('express');
const { sendEmail } = require('../utils/emailService');
const router = Router();

// Test email endpoint (remove in production)
router.post('/test-email', async (req, res) => {
  try {
    const { to } = req.body;
    
    await sendEmail(
      to,
      'UNZA EngPro Email Test',
      'This is a test email from UNZA EngPro system',
      '<h1>Test Email</h1><p>This is a test email from UNZA EngPro system</p>'
    );

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

module.exports = router;