const { Router } = require('express');
const { testEmailConfig } = require('../config/email.config');
const { prisma } = require('../config/prisma.config');

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check email configuration
    const emailStatus = await testEmailConfig();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        email: emailStatus ? 'configured' : 'not configured'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: error.message.includes('prisma') ? 'disconnected' : 'connected',
        email: error.message.includes('email') ? 'not configured' : 'configured'
      }
    });
  }
});

module.exports = router;