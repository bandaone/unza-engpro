const { prisma } = require('../config/prisma.config');
const { generateInitialPassword } = require('../utils/passwordUtils');
const bcrypt = require('bcryptjs');

const seedCoordinator = async () => {
  const email = process.env.COORDINATOR_EMAIL || 'unzaengpro@gmail.com';
  const fullName = process.env.COORDINATOR_NAME || 'System Coordinator';
  const providedPassword = process.env.COORDINATOR_PASSWORD;
  const useProvidedPassword = Boolean(providedPassword && providedPassword.trim().length > 0);
  const plainPassword = useProvidedPassword ? providedPassword.trim() : generateInitialPassword();

  try {
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const coordinator = await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'coordinator',
      },
    });

    console.log('Coordinator account created:');
    console.log('============================');
    console.log('Email:', email);

    if (useProvidedPassword) {
      console.log('Password: (from COORDINATOR_PASSWORD environment variable)');
    } else {
      console.log('Password:', plainPassword);
    }

    console.log('============================');
    console.log('Please store these credentials securely.');

    return { coordinator, password: plainPassword, passwordFromEnv: useProvidedPassword };
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Coordinator already exists. Skipping seed.');
      return { skipped: true };
    }

    console.error('Error seeding coordinator:', error);
    throw error;
  }
};

if (require.main === module) {
  seedCoordinator()
    .then(() => prisma.$disconnect())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error('Failed to seed coordinator:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedCoordinator };