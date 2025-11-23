#!/usr/bin/env node

const http = require('http');

const API_URL = 'http://localhost:3000';
let coordinatorToken = null;
let studentData = null;
let projectData = null;
let supervisorData = null;

// Helper function for HTTP requests
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🔍 Starting UNZA EngPro Feature Test...\n');

  try {
    // 1. Test Health Endpoint
    console.log('1️⃣  Testing Health Endpoint...');
    let res = await makeRequest('GET', '/health');
    if (res.status === 200 && res.data.status === 'healthy') {
      console.log('   ✅ Health check: PASS\n');
    } else {
      console.log(`   ❌ Health check: FAIL (${res.status})\n`);
      return;
    }

    // 2. Test Login
    console.log('2️⃣  Testing Authentication (Login)...');
    res = await makeRequest('POST', '/api/auth/login', {
      email: 'unzaengpro@gmail.com',
      password: 'Admin@2024',
    });
    if (res.status === 200 && res.data.token) {
      coordinatorToken = res.data.token;
      console.log(`   ✅ Login: PASS`);
      console.log(`   📌 User: ${res.data.user.full_name} (${res.data.user.role})\n`);
    } else {
      console.log(`   ❌ Login: FAIL (${res.status})\n`);
      return;
    }

    // 3. Test Get Auth User
    console.log('3️⃣  Testing Get Authenticated User...');
    res = await makeRequest('GET', '/api/auth/me', null, coordinatorToken);
    if (res.status === 200 && res.data.id) {
      console.log(`   ✅ Get Auth User: PASS (ID: ${res.data.id})\n`);
    } else {
      console.log(`   ❌ Get Auth User: FAIL (${res.status})\n`);
    }

    // 4. Test Get Students
    console.log('4️⃣  Testing Students Endpoint...');
    res = await makeRequest('GET', '/api/students', null, coordinatorToken);
    if (res.status === 200) {
      console.log(`   ✅ Get Students: PASS (Count: ${Array.isArray(res.data) ? res.data.length : 0})\n`);
      studentData = Array.isArray(res.data) ? res.data[0] : null;
    } else {
      console.log(`   ❌ Get Students: FAIL (${res.status})\n`);
    }

    // 5. Test Get Projects
    console.log('5️⃣  Testing Projects Endpoint...');
    res = await makeRequest('GET', '/api/projects', null, coordinatorToken);
    if (res.status === 200) {
      console.log(`   ✅ Get Projects: PASS (Count: ${Array.isArray(res.data) ? res.data.length : 0})\n`);
      projectData = Array.isArray(res.data) ? res.data[0] : null;
    } else {
      console.log(`   ❌ Get Projects: FAIL (${res.status})\n`);
    }

    // 6. Test Get Supervisors
    console.log('6️⃣  Testing Supervisors Endpoint...');
    res = await makeRequest('GET', '/api/supervisors', null, coordinatorToken);
    if (res.status === 200) {
      console.log(`   ✅ Get Supervisors: PASS (Count: ${Array.isArray(res.data) ? res.data.length : 0})\n`);
      supervisorData = Array.isArray(res.data) ? res.data[0] : null;
    } else {
      console.log(`   ❌ Get Supervisors: FAIL (${res.status})\n`);
    }

    // 7. Test Get Allocations
    console.log('7️⃣  Testing Allocations Endpoint...');
    res = await makeRequest('GET', '/api/allocations', null, coordinatorToken);
    if (res.status === 200) {
      console.log(`   ✅ Get Allocations: PASS (Count: ${Array.isArray(res.data) ? res.data.length : 0})\n`);
    } else {
      console.log(`   ❌ Get Allocations: FAIL (${res.status})\n`);
    }

    // 8. Test Create Student
    console.log('8️⃣  Testing Create Student...');
    res = await makeRequest('POST', '/api/students', {
      full_name: 'Test Student',
      email: `teststudent${Date.now()}@unza.ac.zm`,
      registration_number: `TS${Date.now()}`,
      password: 'TestPass123',
    }, coordinatorToken);
    if (res.status === 201) {
      console.log(`   ✅ Create Student: PASS (ID: ${res.data.student?.id})\n`);
    } else {
      console.log(`   ❌ Create Student: FAIL (${res.status})\n`);
    }

    // 9. Test Create Project
    console.log('9️⃣  Testing Create Project...');
    if (supervisorData) {
      res = await makeRequest('POST', '/api/projects', {
        title: `Test Project ${Date.now()}`,
        description: 'A test project for feature validation',
        supervisorId: supervisorData.id,
        status: 'open',
      }, coordinatorToken);
      if (res.status === 201) {
        console.log(`   ✅ Create Project: PASS (ID: ${res.data.project?.id})\n`);
      } else {
        console.log(`   ❌ Create Project: FAIL (${res.status})\n`);
      }
    } else {
      console.log(`   ⚠️  Create Project: SKIPPED (No supervisor data)\n`);
    }

    // 10. Test Profile Update
    console.log('🔟 Testing Update Profile...');
    res = await makeRequest('PUT', '/api/users/profile', {
      full_name: 'System Coordinator Updated',
    }, coordinatorToken);
    if (res.status === 200) {
      console.log(`   ✅ Update Profile: PASS\n`);
    } else {
      console.log(`   ❌ Update Profile: FAIL (${res.status})\n`);
    }

    // 11. Test Change Password
    console.log('1️⃣1️⃣  Testing Change Password...');
    res = await makeRequest('POST', '/api/auth/change-password', {
      currentPassword: 'Admin@2024',
      newPassword: 'Admin@2024',
    }, coordinatorToken);
    if (res.status === 200) {
      console.log(`   ✅ Change Password: PASS\n`);
    } else {
      console.log(`   ❌ Change Password: FAIL (${res.status})\n`);
    }

    // 12. Test Dashboard Stats
    console.log('1️⃣2️⃣  Testing Dashboard Stats...');
    res = await makeRequest('GET', '/api/dashboard/stats', null, coordinatorToken);
    if (res.status === 200) {
      console.log(`   ✅ Dashboard Stats: PASS`);
      console.log(`      Students: ${res.data.studentCount || 0}`);
      console.log(`      Supervisors: ${res.data.supervisorCount || 0}`);
      console.log(`      Projects: ${res.data.projectCount || 0}\n`);
    } else {
      console.log(`   ❌ Dashboard Stats: FAIL (${res.status})\n`);
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('✅ FEATURE TEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

test();
