const { prisma } = require('../config/prisma.config');
const { generateInitialPassword } = require('../utils/passwordUtils');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    // Create coordinator
    const coordinatorPassword = generateInitialPassword();
    const coordinator = await prisma.user.create({
      data: {
        email: 'coordinator@unza.zm',
        password: await bcrypt.hash(coordinatorPassword, 10),
        full_name: 'System Coordinator',
        role: 'COORDINATOR'
      }
    });
    console.log('Coordinator created:', { email: 'coordinator@unza.zm', password: coordinatorPassword });

    // Create supervisor
    const supervisorPassword = generateInitialPassword();
    const supervisor = await prisma.user.create({
      data: {
        email: 'supervisor@unza.zm',
        password: await bcrypt.hash(supervisorPassword, 10),
        full_name: 'Test Supervisor',
        role: 'SUPERVISOR'
      }
    });
    console.log('Supervisor created:', { email: 'supervisor@unza.zm', password: supervisorPassword });

    // Create student
    const studentPassword = generateInitialPassword();
    const student = await prisma.user.create({
      data: {
        email: 'student@unza.zm',
        password: await bcrypt.hash(studentPassword, 10),
        full_name: 'Test Student',
        role: 'STUDENT'
      }
    });
    console.log('Student created:', { email: 'student@unza.zm', password: studentPassword });

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();