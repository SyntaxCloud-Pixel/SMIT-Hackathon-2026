import { createApp } from '../app';
import http from 'http';
import { AddressInfo } from 'net';

async function runTests() {
  console.log('\n--- STARTING HCM LITE PHASE 2 VERIFICATION SUITE ---');
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
    // 1. Verify health check
    console.log('\n1. Testing Health Check Endpoint:');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = (await healthRes.json()) as any;
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthData.success === true, 'Health check indicates operational status');

    // 2. Fresh State Setup Check
    console.log('\n2. Testing Fresh Database Setup Check:');
    const statusRes = await fetch(`${baseUrl}/setup/status`);
    const statusData = (await statusRes.json()) as any;
    assert(statusRes.status === 200, 'GET /api/setup/status returns HTTP 200');
    assert(statusData.data.setupCompleted === false, 'Fresh system correctly reports setupCompleted = false (No dummy records)');

    // 3. First-Run Setup Wizard
    console.log('\n3. Testing First-Run Company Setup Initialization:');
    const setupPayload = {
      companyName: 'Acme Global Technologies',
      timezone: 'Asia/Karachi',
      officeStartTime: '09:00',
      gracePeriodMinutes: 15,
      weekendDays: ['Saturday', 'Sunday'],
      officeAddress: '100 Innovation Boulevard, Tech Park',
      officeLatitude: 24.8607,
      officeLongitude: 67.0011,
      allowedAttendanceRadius: 250,
      adminFullName: 'Sarah Connor',
      adminEmail: 'admin@acmetech.com',
      adminPassword: 'SuperSecurePassword123!',
      confirmPassword: 'SuperSecurePassword123!',
    };

    const initRes = await fetch(`${baseUrl}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setupPayload),
    });
    const initData = (await initRes.json()) as any;
    assert(initRes.status === 201, 'POST /api/setup/initialize returns HTTP 201 Created');
    assert(initData.data.company.name === 'Acme Global Technologies', 'Company name persisted accurately');
    assert(initData.data.user.role === 'ADMIN', 'Initial user is assigned ADMIN role');
    assert(initData.data.token && typeof initData.data.token === 'string', 'JWT session token generated and returned');

    const adminToken = initData.data.token;
    const adminUser = initData.data.user;

    // 4. Setup Idempotency & Protection against duplicate initialization
    console.log('\n4. Testing Setup Protection (Second setup attempt must be rejected):');
    const secondSetupRes = await fetch(`${baseUrl}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setupPayload),
    });
    assert(secondSetupRes.status === 400, 'Second initialization attempt rejected with HTTP 400');
    const secondSetupData = (await secondSetupRes.json()) as any;
    assert(secondSetupData.error.code === 'SETUP_ALREADY_COMPLETED', 'Returns error code SETUP_ALREADY_COMPLETED');

    // 5. Default Leave Quotas Verification
    console.log('\n5. Testing Default Leave Types Quotas:');
    const leaveTypesRes = await fetch(`${baseUrl}/organization/leave-types`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const leaveTypesData = (await leaveTypesRes.json()) as any;
    assert(leaveTypesRes.status === 200, 'GET /api/organization/leave-types returns HTTP 200');
    const leaveTypes = leaveTypesData.data;
    assert(leaveTypes.length === 4, 'Exactly 4 default leave types created');

    const annual = leaveTypes.find((lt: any) => lt.name === 'Annual Leave');
    const sick = leaveTypes.find((lt: any) => lt.name === 'Sick Leave');
    const casual = leaveTypes.find((lt: any) => lt.name === 'Casual Leave');
    const unpaid = leaveTypes.find((lt: any) => lt.name === 'Unpaid Leave');

    assert(annual && Number(annual.annualQuota) === 14, 'Annual leave has 14 days quota');
    assert(sick && Number(sick.annualQuota) === 8, 'Sick leave has 8 days quota');
    assert(casual && Number(casual.annualQuota) === 10, 'Casual leave has 10 days quota');
    assert(unpaid && Number(unpaid.annualQuota) === 0 && unpaid.isPaid === false, 'Unpaid leave is unpaid with 0 initial quota');

    // 6. Authentication: Valid Login
    console.log('\n6. Testing Authentication Flow (Valid & Invalid Credentials):');
    const validLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acmetech.com', password: 'SuperSecurePassword123!' }),
    });
    assert(validLoginRes.status === 200, 'Valid credentials login returns HTTP 200');

    // Authentication: Invalid Password
    const invalidPwRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acmetech.com', password: 'WrongPassword999!' }),
    });
    assert(invalidPwRes.status === 401, 'Invalid password returns HTTP 401 Unauthorized');

    // Authentication: Nonexistent User
    const noUserRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@acmetech.com', password: 'Password123!' }),
    });
    assert(noUserRes.status === 401, 'Nonexistent account returns HTTP 401 Unauthorized');

    // 7. Role-Based Access Control
    console.log('\n7. Testing Role-Based Access Control & Audit Logs:');
    // Admin can view audit logs
    const auditRes = await fetch(`${baseUrl}/organization/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = (await auditRes.json()) as any;
    assert(auditRes.status === 200, 'Admin can view audit logs (HTTP 200)');
    assert(auditData.data.length > 0, 'Audit log recorded initial setup and authentication events');

    // Unauthenticated user cannot access audit logs
    const unauthRes = await fetch(`${baseUrl}/organization/audit-logs`);
    assert(unauthRes.status === 401, 'Unauthenticated request to protected endpoint returns HTTP 401');

    // Create an employee user directly to test role boundary
    const { storeService } = await import('../services/store.service');
    const employeeUser = await storeService.createUser({
      companyId: adminUser.companyId,
      email: 'john.doe@acmetech.com',
      fullName: 'John Doe',
      password: 'EmployeePassword123!',
      role: 'EMPLOYEE',
      actorId: adminUser.id,
    });

    const empLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john.doe@acmetech.com', password: 'EmployeePassword123!' }),
    });
    const empLoginData = (await empLoginRes.json()) as any;
    const employeeToken = empLoginData.data.token;

    // Employee cannot access Admin-only audit logs
    const empAuditRes = await fetch(`${baseUrl}/organization/audit-logs`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empAuditRes.status === 403, 'Employee is forbidden from accessing Admin audit logs (HTTP 403)');

    // 8. Account Deactivation
    console.log('\n8. Testing Account Deactivation & Access Revocation:');
    const deactRes = await fetch(`${baseUrl}/organization/users/${employeeUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert(deactRes.status === 200, 'Admin successfully deactivates employee account');

    // Deactivated user cannot log in
    const deactLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john.doe@acmetech.com', password: 'EmployeePassword123!' }),
    });
    assert(deactLoginRes.status === 403, 'Deactivated account login returns HTTP 403 Forbidden');
    const deactLoginData = (await deactLoginRes.json()) as any;
    assert(deactLoginData.error.code === 'ACCOUNT_DEACTIVATED', 'Error code is ACCOUNT_DEACTIVATED');

    // Deactivated user's existing token is rejected by requireActiveAccount
    const deactReqRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(deactReqRes.status === 403, 'Protected endpoint immediately rejects requests from deactivated account');

    console.log(`\n========================================`);
    console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log(`========================================\n`);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
