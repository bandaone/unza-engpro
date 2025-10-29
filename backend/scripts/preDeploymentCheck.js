const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Run pre-deployment checks
 */
async function runPreDeploymentChecks() {
  console.log('Starting pre-deployment checks...\n');
  let allPassed = true;

  // Check 1: Database Connection
  try {
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    allPassed = false;
  }

  // Check 2: Required Environment Variables
  console.log('2. Checking environment variables...');
  const requiredEnvVars = [
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASS',
    'FRONTEND_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set\n');
  } else {
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    allPassed = false;
  }

  // Check 3: Email Configuration
  try {
    console.log('3. Testing email configuration...');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.verify();
    console.log('✅ Email configuration is valid\n');
  } catch (error) {
    console.error('❌ Email configuration failed:', error.message);
    allPassed = false;
  }

  // Check 4: Upload Directory
  try {
    console.log('4. Checking upload directory...');
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const testFile = path.join(uploadDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Upload directory is writable\n');
  } catch (error) {
    console.error('❌ Upload directory check failed:', error.message);
    allPassed = false;
  }

  // Check 5: Required Database Tables
  try {
    console.log('5. Checking database tables...');
    const requiredTables = [
      'User',
      'Student',
      'Supervisor',
      'Project',
      'Group',
      'ProjectAllocation',
      'LogbookEntry',
      'Notification'
    ];

    for (const table of requiredTables) {
      const count = await prisma[table.toLowerCase()].count();
      console.log(`  - Table ${table}: ${count} records`);
    }
    console.log('✅ All required tables exist\n');
  } catch (error) {
    console.error('❌ Database tables check failed:', error.message);
    allPassed = false;
  }

  // Check 6: System Settings
  try {
    console.log('6. Checking system settings...');
    const settings = await prisma.systemSetting.findMany();
    if (settings.length === 0) {
      console.log('⚠️  No system settings found. Default settings will be used.\n');
    } else {
      console.log('✅ System settings are configured\n');
    }
  } catch (error) {
    console.error('❌ System settings check failed:', error.message);
    allPassed = false;
  }

  // Final Report
  console.log('\n=== Pre-deployment Check Summary ===');
  if (allPassed) {
    console.log('✅ All checks passed! System is ready for deployment.');
  } else {
    console.error('❌ Some checks failed. Please fix the issues before deploying.');
  }

  await prisma.$disconnect();
  return allPassed;
}

// Run checks if script is run directly
if (require.main === module) {
  runPreDeploymentChecks()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error during checks:', error);
      process.exit(1);
    });
}

module.exports = runPreDeploymentChecks;