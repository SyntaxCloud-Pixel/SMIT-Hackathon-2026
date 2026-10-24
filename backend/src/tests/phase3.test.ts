import { createApp } from '../app';
import http from 'http';
import { AddressInfo } from 'net';

async function runTests() {
  console.log('\n--- STARTING HCM LITE PHASE 3 VERIFICATION SUITE ---');
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  try {
    // 1. Initial Setup to establish company and Admin
    console.log('\n1. Initializing Company & Admin:');
    const initRes = await fetch(`${baseUrl}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Apex Enterprise Solutions',
        timezone: 'UTC',
        officeStartTime: '09:00',
        gracePeriodMinutes: 15,
        weekendDays: ['Saturday', 'Sunday'],
        adminFullName: 'Alice Administrator',
        adminEmail: 'alice.admin@apex.com',
        adminPassword: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });
    const initData = (await initRes.json()) as any;
    assert(initRes.status === 201, 'Setup initialization successful (HTTP 201)');
    const adminToken = initData.data.token;

    // 2. Department Management Tests
    console.log('\n2. Testing Department Management:');
    // Create Department
    const dept1Res = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Engineering', description: 'Software Development' }),
    });
    const dept1Data = (await dept1Res.json()) as any;
    assert(dept1Res.status === 201, 'Create department returns HTTP 201');
    const engDeptId = dept1Data.data.id;

    // Reject duplicate department
    const dupDeptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Engineering', description: 'Duplicate Dept' }),
    });
    assert(dupDeptRes.status === 400, 'Duplicate department name rejected with HTTP 400');

    // Edit Department
    const editDeptRes = await fetch(`${baseUrl}/departments/${engDeptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Core Engineering', description: 'Product & Infrastructure' }),
    });
    const editDeptData = (await editDeptRes.json()) as any;
    assert(editDeptRes.status === 200, 'Edit department returns HTTP 200');
    assert(editDeptData.data.name === 'Core Engineering', 'Department name updated');

    // Create a 2nd department to test deactivation
    const dept2Res = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Legacy Operations', description: 'Phased out unit' }),
    });
    const dept2Data = (await dept2Res.json()) as any;
    const legacyDeptId = dept2Data.data.id;

    // Deactivate Department
    const deactDeptRes = await fetch(`${baseUrl}/departments/${legacyDeptId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert(deactDeptRes.status === 200, 'Deactivate department returns HTTP 200');

    // 3. Designation Management Tests
    console.log('\n3. Testing Designation Management:');
    // Create Designation in active department
    const desig1Res = await fetch(`${baseUrl}/designations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Senior Full Stack Engineer',
        departmentId: engDeptId,
        description: 'Lead developer',
      }),
    });
    const desig1Data = (await desig1Res.json()) as any;
    assert(desig1Res.status === 201, 'Create designation in active department returns HTTP 201');
    const seniorDevDesigId = desig1Data.data.id;

    // Reject creating designation in inactive department
    const inactDesigRes = await fetch(`${baseUrl}/designations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Legacy Specialist',
        departmentId: legacyDeptId,
      }),
    });
    assert(inactDesigRes.status === 400, 'Creating designation in deactivated department rejected with HTTP 400');

    // 4. Leave Type and Holiday Configuration Tests
    console.log('\n4. Testing Leave Types & Holiday Configuration:');
    const leavesRes = await fetch(`${baseUrl}/organization/leave-types`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const leavesData = (await leavesRes.json()) as any;
    const annualLeave = leavesData.data.find((lt: any) => lt.name === 'Annual Leave');

    // Admin updates leave quota
    const updateLeaveRes = await fetch(`${baseUrl}/organization/leave-types/${annualLeave.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ annualQuota: 18, isPaid: true, isActive: true }),
    });
    const updateLeaveData = (await updateLeaveRes.json()) as any;
    assert(updateLeaveRes.status === 200, 'Admin can update leave type quota (HTTP 200)');
    assert(Number(updateLeaveData.data.annualQuota) === 18, 'Annual quota updated to 18');

    // Create Public Holiday
    const holRes = await fetch(`${baseUrl}/holidays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'New Year Day',
        holidayDate: '2026-01-01',
        description: 'Public holiday',
      }),
    });
    const holData = (await holRes.json()) as any;
    assert(holRes.status === 201, 'Create public holiday returns HTTP 201');
    const holId = holData.data.id;

    // Reject duplicate holiday on same date
    const dupHolRes = await fetch(`${baseUrl}/holidays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Another Jan 1 Holiday',
        holidayDate: '2026-01-01',
      }),
    });
    assert(dupHolRes.status === 400, 'Duplicate holiday date rejected with HTTP 400');

    // Delete holiday
    const delHolRes = await fetch(`${baseUrl}/holidays/${holId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delHolRes.status === 200, 'Delete holiday returns HTTP 200');

    // 5. Employee Registration Workflow Tests
    console.log('\n5. Testing Employee Registration:');
    // Reject assigning employee to deactivated department
    const inactDeptEmpRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Bob Smith',
        email: 'bob.smith@apex.com',
        employeeCode: 'EMP-001',
        departmentId: legacyDeptId,
        designationId: seniorDevDesigId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-02-01',
        basicSalary: 65000,
      }),
    });
    assert(inactDeptEmpRes.status === 400, 'Registering employee in deactivated department rejected with HTTP 400');

    // Reject negative salary
    const negSalEmpRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Bob Smith',
        email: 'bob.smith@apex.com',
        employeeCode: 'EMP-001',
        departmentId: engDeptId,
        designationId: seniorDevDesigId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-02-01',
        basicSalary: -500,
      }),
    });
    assert(negSalEmpRes.status === 422, 'Negative basic salary rejected by validation (HTTP 422)');

    // Successful Employee Registration
    const regEmpRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Bob Smith',
        email: 'bob.smith@apex.com',
        employeeCode: 'EMP-001',
        phone: '+1-555-0199',
        address: '123 Tech Avenue',
        departmentId: engDeptId,
        designationId: seniorDevDesigId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-02-01',
        basicSalary: 85000,
      }),
    });
    const regEmpData = (await regEmpRes.json()) as any;
    assert(regEmpRes.status === 201, 'Valid employee registration returns HTTP 201');
    assert(regEmpData.data.employee.employeeCode === 'EMP-001', 'Employee code persisted correctly');
    assert(regEmpData.data.temporaryPassword && regEmpData.data.temporaryPassword.length > 6, 'Secure temporary password generated');
    const bobEmpId = regEmpData.data.employee.id;
    const bobUserId = regEmpData.data.employee.userId;
    const bobTempPassword = regEmpData.data.temporaryPassword;

    // Reject duplicate employee code
    const dupCodeRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Charlie Brown',
        email: 'charlie@apex.com',
        employeeCode: 'EMP-001', // duplicate!
        departmentId: engDeptId,
        designationId: seniorDevDesigId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-02-01',
        basicSalary: 70000,
      }),
    });
    assert(dupCodeRes.status === 400, 'Duplicate employee code rejected with HTTP 400');

    // Reject duplicate email
    const dupEmailRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Charlie Brown',
        email: 'bob.smith@apex.com', // duplicate email!
        employeeCode: 'EMP-002',
        departmentId: engDeptId,
        designationId: seniorDevDesigId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-02-01',
        basicSalary: 70000,
      }),
    });
    assert(dupEmailRes.status === 400, 'Duplicate email rejected with HTTP 400');

    // 6. Login with Registered Employee Account
    console.log('\n6. Testing Employee Login Account & First Login Flags:');
    const empLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob.smith@apex.com', password: bobTempPassword }),
    });
    const empLoginData = (await empLoginRes.json()) as any;
    assert(empLoginRes.status === 200, 'Employee can log in with temporary password (HTTP 200)');
    assert(empLoginData.data.user.role === 'EMPLOYEE', 'New user role is strictly EMPLOYEE');
    assert(empLoginData.data.user.mustChangePassword === true, 'Account has must_change_password = true');
    const employeeToken = empLoginData.data.token;

    // 7. Security & Authorization Checks
    console.log('\n7. Testing Security Boundaries & Record-Level Authorization:');
    // Employee cannot register another employee
    const unauthRegRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        fullName: 'Hacker Joe',
        email: 'hacker@apex.com',
        employeeCode: 'EMP-999',
        departmentId: engDeptId,
        designationId: seniorDevDesigId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-03-01',
        basicSalary: 999999,
      }),
    });
    assert(unauthRegRes.status === 403, 'Employee is forbidden from registering other employees (HTTP 403)');

    // Employee cannot manage departments
    const unauthDeptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Dept' }),
    });
    assert(unauthDeptRes.status === 403, 'Employee is forbidden from creating departments (HTTP 403)');

    // Create a 2nd employee to test private profile boundary
    const emp2Res = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Dana Scully',
        email: 'dana.scully@apex.com',
        employeeCode: 'EMP-002',
        departmentId: engDeptId,
        designationId: seniorDevDesigId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-02-15',
        basicSalary: 90000,
      }),
    });
    const emp2Data = (await emp2Res.json()) as any;
    const danaEmpId = emp2Data.data.employee.id;

    // Employee Bob attempts to access Dana's profile
    const unauthProfileRes = await fetch(`${baseUrl}/employees/${danaEmpId}`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(unauthProfileRes.status === 403, 'Employee cannot access another employee profile (HTTP 403 Forbidden)');

    // Employee Bob can access his own profile
    const ownProfileRes = await fetch(`${baseUrl}/employees/${bobEmpId}`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(ownProfileRes.status === 200, 'Employee can view their own profile (HTTP 200)');

    // 8. Deactivate Employee & Revoke Access
    console.log('\n8. Testing Employee Deactivation:');
    const deactEmpRes = await fetch(`${baseUrl}/employees/${bobEmpId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ employmentStatus: 'INACTIVE', isActive: false }),
    });
    assert(deactEmpRes.status === 200, 'Admin can deactivate employee (HTTP 200)');

    // Deactivated employee cannot use protected APIs
    const deactSessionRes = await fetch(`${baseUrl}/employees/${bobEmpId}`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(deactSessionRes.status === 403, 'Deactivated employee token rejected with HTTP 403');

    // 9. CSV Import & Export Verification
    console.log('\n9. Testing CSV Import and Export:');
    // Preview CSV rows
    const previewRes = await fetch(`${baseUrl}/employees/import/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rows: [
          {
            employeeCode: 'EMP-003',
            fullName: 'Fox Mulder',
            email: 'fox.mulder@apex.com',
            departmentName: 'Core Engineering',
            designationName: 'Senior Full Stack Engineer',
            employmentType: 'FULL_TIME',
            joiningDate: '2026-03-01',
            basicSalary: 88000,
          },
          {
            employeeCode: 'EMP-002', // duplicate code!
            fullName: 'Invalid Code Person',
            email: 'invalid@apex.com',
            departmentName: 'Core Engineering',
            designationName: 'Senior Full Stack Engineer',
            employmentType: 'FULL_TIME',
            joiningDate: '2026-03-01',
            basicSalary: 50000,
          },
        ],
      }),
    });
    const previewData = (await previewRes.json()) as any;
    assert(previewRes.status === 200, 'CSV preview returns HTTP 200');
    assert(previewData.data.validRows === 1 && previewData.data.invalidRows === 1, 'CSV preview identified 1 valid and 1 invalid row');

    // Commit CSV import
    const commitRes = await fetch(`${baseUrl}/employees/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rows: [
          {
            employeeCode: 'EMP-003',
            fullName: 'Fox Mulder',
            email: 'fox.mulder@apex.com',
            departmentName: 'Core Engineering',
            designationName: 'Senior Full Stack Engineer',
            employmentType: 'FULL_TIME',
            joiningDate: '2026-03-01',
            basicSalary: 88000,
          },
        ],
      }),
    });
    const commitData = (await commitRes.json()) as any;
    assert(commitRes.status === 200, 'CSV commit returns HTTP 200');
    assert(commitData.data.importedCount === 1, 'Imported 1 employee successfully');

    // Export CSV
    const exportRes = await fetch(`${baseUrl}/employees/export/csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(exportRes.status === 200, 'CSV export returns HTTP 200');
    const csvText = await exportRes.text();
    assert(csvText.includes('Employee Code') && csvText.includes('Fox Mulder'), 'CSV output contains employee records and headers');

    console.log(`\n========================================`);
    console.log(`ALL PHASE 3 TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log(`========================================\n`);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Phase 3 test suite failed:', err);
  process.exit(1);
});
