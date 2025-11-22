const { Router } = require('express');
const { testEmailConfig } = require('../config/email.config');
const { prisma } = require('../config/prisma.config');

const router = Router();

// Simple health check for container health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check for application monitoring
router.get('/health/detailed', async (req, res) => {
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