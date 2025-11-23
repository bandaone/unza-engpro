const http = require('http');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

const request = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

const test = async () => {
  console.log('\n=== Student Management Features Test Suite ===\n');

  try {
    // 1. Login
    console.log('1. Testing Login...');
    let res = await request('POST', '/auth/login', {
      email: 'unzaengpro@gmail.com',
      password: 'Admin@2024',
    });
    if (res.status === 200 && res.data.token) {
      authToken = res.data.token;
      console.log('✓ Login successful, token obtained\n');
    } else {
      console.log('✗ Login failed:', res.data.message);
      return;
    }

    // 2. Get Students
    console.log('2. Testing Get Students...');
    res = await request('GET', '/students');
    if (res.status === 200) {
      console.log(`✓ Retrieved ${res.data.length || 0} students\n`);
    } else {
      console.log('✗ Failed to get students:', res.data);
      return;
    }

    // 3. Create Single Student
    console.log('3. Testing Create Single Student...');
    const testStudent = {
      full_name: 'Test Student ' + Date.now(),
      email: `student${Date.now()}@test.com`,
      registration_number: `REG${Date.now()}`,
      password: 'TempPass123',
    };
    res = await request('POST', '/students', testStudent);
    let testStudentId = null;
    if (res.status === 201) {
      testStudentId = res.data.student.id;
      console.log(`✓ Student created successfully (ID: ${testStudentId})\n`);
    } else {
      console.log('✗ Failed to create student:', res.data);
      return;
    }

    // 4. Get Student by ID
    console.log('4. Testing Get Student by ID...');
    res = await request('GET', `/students/${testStudentId}`);
    if (res.status === 200) {
      console.log(`✓ Retrieved student: ${res.data.user?.full_name}\n`);
    } else {
      console.log('✗ Failed to get student by ID:', res.data);
    }

    // 5. Update Student
    console.log('5. Testing Update Student...');
    res = await request('PUT', `/students/${testStudentId}`, {
      full_name: 'Updated Student Name',
      email: testStudent.email,
      registration_number: testStudent.registration_number,
    });
    if (res.status === 200) {
      console.log(`✓ Student updated successfully\n`);
    } else {
      console.log('✗ Failed to update student:', res.data);
    }

    // 6. Delete Student
    console.log('6. Testing Delete Student...');
    res = await request('DELETE', `/students/${testStudentId}`);
    if (res.status === 200) {
      console.log(`✓ Student deleted successfully\n`);
    } else {
      console.log('✗ Failed to delete student:', res.data);
    }

    // 7. Verify Student is Deleted
    console.log('7. Verifying Student Deletion...');
    res = await request('GET', `/students/${testStudentId}`);
    if (res.status === 404) {
      console.log(`✓ Student confirmed deleted\n`);
    } else {
      console.log('✗ Student still exists after deletion');
    }

    console.log('=== All Student Management Tests Complete ===\n');
  } catch (error) {
    console.error('Test error:', error.message);
  }
};

test();
