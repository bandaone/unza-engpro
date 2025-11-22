const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCoordinator() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'coordinator' },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true
      }
    });
    
    console.log('\n===========================================');
    console.log('COORDINATOR USER(S) IN DATABASE:');
    console.log('===========================================');
    console.log(JSON.stringify(users, null, 2));
    console.log('===========================================\n');
    
    if (users.length > 0) {
      console.log('✅ Coordinator user exists!');
      console.log('📧 Email:', users[0].email);
      console.log('👤 Name:', users[0].full_name);
      console.log('\n🔐 Login credentials:');
      console.log('   Email:', users[0].email);
      console.log('   Password: Admin@2024 (from COORDINATOR_PASSWORD in .env)');
    } else {
      console.log('❌ No coordinator user found!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCoordinator();
