const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'unzaengpro@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('User found:', user.email);
    console.log('Password hash:', user.password_hash);
    
    const testPassword = 'Admin@2024';
    const isMatch = await bcrypt.compare(testPassword, user.password_hash);
    
    console.log('\nTesting password:', testPassword);
    console.log('Password matches:', isMatch ? '✅ YES' : '❌ NO');
    
    if (!isMatch) {
      console.log('\n🔄 Trying to reset password...');
      const newHash = await bcrypt.hash(testPassword, 10);
      
      await prisma.user.update({
        where: { email: 'unzaengpro@gmail.com' },
        data: { password_hash: newHash }
      });
      
      console.log('✅ Password reset successfully!');
      console.log('New hash:', newHash);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
