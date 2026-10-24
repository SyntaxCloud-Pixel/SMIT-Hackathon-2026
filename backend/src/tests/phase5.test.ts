import { createApp } from '../app';
import http, { Server } from 'http';
import { AddressInfo } from 'net';

let BASE_URL: string;
let server: Server;
let adminToken: string;
let employeeToken: string;
let employeeId: string;
let employeeUserId: string;
let companyId: string;
let departmentId: string;
let designationId: string;
let annualLeaveTypeId: string;
let unpaidLeaveTypeId: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function runPhase5Tests() {
  console.log('\n--- STARTING HCM LITE PHASE 5 LEAVE MANAGEMENT VERIFICATION SUITE ---\n');

  const app = createApp();
  server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const port = (server.address() as AddressInfo).port;
  BASE_URL = `http://127.0.0.1:${port}/api`;

  try {
    // -------------------------------------------------------------
    // 1. Initial Setup: Initialize Company, Department, Designation, and Employee
    // -------------------------------------------------------------
    console.log('1. Initializing Company, Policies & Staff:');
    const initRes = await fetch(`${BASE_URL}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Leave Management Systems',
        timezone: 'UTC',
        officeStartTime: '09:00',
        gracePeriodMinutes: 15,
        weekendDays: ['Saturday', 'Sunday'],
        adminFullName: 'Leave Admin',
        adminEmail: 'leave.admin@lms.com',
        adminPassword: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }),
    });
    assert(initRes.status === 201, 'Company initialization returns HTTP 201');
    const initData: any = await initRes.json();
    adminToken = initData.data.token;
    companyId = initData.data.company.id;

    // Create a department
    const deptRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Research & Development',
        description: 'R&D Department',
      }),
    });
    const deptData: any = await deptRes.json();
    departmentId = deptData.data.id;

    // Create a designation
    const desigRes = await fetch(`${BASE_URL}/designations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'AI Scientist',
        departmentId,
      }),
    });
    const desigData: any = await desigRes.json();
    designationId = desigData.data.id;

    // Create a public holiday: 2026-05-01 (Labor Day) - Friday
    const holRes = await fetch(`${BASE_URL}/holidays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Labor Day',
        holidayDate: '2026-05-01',
        description: 'Official public holiday',
      }),
    });
    assert(holRes.status === 201, 'Public holiday created on 2026-05-01');

    // Retrieve default leave types
    const ltRes = await fetch(`${BASE_URL}/organization/leave-types`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ltData: any = await ltRes.json();
    const annualLt = ltData.data.find((lt: any) => lt.name.toLowerCase().includes('annual'));
    const unpaidLt = ltData.data.find((lt: any) => lt.name.toLowerCase().includes('unpaid'));
    assert(annualLt !== undefined, 'Annual Leave policy exists');
    assert(unpaidLt !== undefined, 'Unpaid Leave policy exists');
    annualLeaveTypeId = annualLt.id;
    unpaidLeaveTypeId = unpaidLt.id;

    // Register an employee
    const empRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeCode: 'EMP-LEAVE-01',
        fullName: 'Alan Turing',
        email: 'alan.turing@lms.com',
        phone: '+1-555-0199',
        departmentId,
        designationId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-01-01',
        basicSalary: 95000,
      }),
    });
    assert(empRes.status === 201, 'Employee registered returns HTTP 201');
    const empData: any = await empRes.json();
    employeeId = empData.data.employee.id;
    employeeUserId = empData.data.employee.userId;
    const tempPassword = empData.data.temporaryPassword;

    // Log in as the employee
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alan.turing@lms.com',
        password: tempPassword,
      }),
    });
    assert(loginRes.status === 200, 'Employee login returns HTTP 200');
    const loginData: any = await loginRes.json();
    employeeToken = loginData.data.token;

    // -------------------------------------------------------------
    // 2. Testing Working Day Estimation (Skipping Weekends & Holidays)
    // -------------------------------------------------------------
    console.log('\n2. Testing Working Days Calculation:');
    // Date range: 2026-04-30 (Thursday) to 2026-05-04 (Monday)
    // 2026-04-30: Thursday (Working day 1)
    // 2026-05-01: Friday (Holiday: Labor Day) -> Skipped
    // 2026-05-02: Saturday (Weekend) -> Skipped
    // 2026-05-03: Sunday (Weekend) -> Skipped
    // 2026-05-04: Monday (Working day 2)
    // Total calendar days = 5, Working days = exactly 2!
    const estimateRes = await fetch(`${BASE_URL}/leaves/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        startDate: '2026-04-30',
        endDate: '2026-05-04',
      }),
    });
    assert(estimateRes.status === 200, 'POST /api/leaves/estimate returns HTTP 200');
    const estimateData: any = await estimateRes.json();
    assert(estimateData.data.workingDays === 2, 'Correctly calculates 2 working days across holiday & weekend');
    assert(estimateData.data.holidayDaysCount === 1, 'Correctly identified 1 holiday');
    assert(estimateData.data.weekendDaysCount === 2, 'Correctly identified 2 weekend days');
    assert(estimateData.data.totalCalendarDays === 5, 'Total calendar span is 5 days');

    // Invalid date range (end date earlier than start date)
    const invalidRangeRes = await fetch(`${BASE_URL}/leaves/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        startDate: '2026-05-10',
        endDate: '2026-05-05',
      }),
    });
    assert(invalidRangeRes.status === 422, 'End date earlier than start date rejected with HTTP 422');

    // -------------------------------------------------------------
    // 3. Testing Initial Balances
    // -------------------------------------------------------------
    console.log('\n3. Testing Leave Balances:');
    const balancesRes = await fetch(`${BASE_URL}/leaves/balances`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(balancesRes.status === 200, 'GET /api/leaves/balances returns HTTP 200');
    const balancesData: any = await balancesRes.json();
    const annualBalance = balancesData.data.find((b: any) => b.leaveTypeId === annualLeaveTypeId);
    assert(annualBalance.annualQuota === 14, 'Annual leave initial quota is 14');
    assert(annualBalance.remainingDays === 14, 'Annual leave initial remaining is 14');
    assert(annualBalance.usedDays === 0, 'Annual leave initial used is 0');

    // -------------------------------------------------------------
    // 4. Submitting Leave Request & Insufficient Balance Defense
    // -------------------------------------------------------------
    console.log('\n4. Testing Leave Submission & Over-Quota Rejection:');
    // Try to request 20 working days on Annual Leave (which has only 14 days)
    // 2026-06-01 to 2026-06-26 (approx 20 working days)
    const overQuotaRes = await fetch(`${BASE_URL}/leaves/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-06-01',
        endDate: '2026-06-26',
        reason: 'Attempting to request more than 14 days',
      }),
    });
    assert(overQuotaRes.status === 422, 'Exceeding annual quota rejected with HTTP 422');
    const overQuotaData: any = await overQuotaRes.json();
    assert(overQuotaData.error.code === 'INSUFFICIENT_LEAVE_BALANCE', 'Returns INSUFFICIENT_LEAVE_BALANCE error code');

    // Submit valid Annual Leave request: 3 working days (2026-06-01 Monday to 2026-06-03 Wednesday)
    const validSubmitRes = await fetch(`${BASE_URL}/leaves/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        reason: 'Family wedding ceremony',
      }),
    });
    assert(validSubmitRes.status === 201, 'Valid leave submission returns HTTP 201 Created');
    const validSubmitData: any = await validSubmitRes.json();
    const requestId = validSubmitData.data.id;
    assert(validSubmitData.data.workingDays === 3, 'Calculated exactly 3 working days');
    assert(validSubmitData.data.status === 'PENDING', 'Initial status is PENDING');

    // -------------------------------------------------------------
    // 5. Overlapping Leave Request Defense
    // -------------------------------------------------------------
    console.log('\n5. Testing Overlapping Request Rejection:');
    // Submit an overlapping request (2026-06-02 to 2026-06-05)
    const overlapRes = await fetch(`${BASE_URL}/leaves/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-06-02',
        endDate: '2026-06-05',
        reason: 'Overlapping request',
      }),
    });
    assert(overlapRes.status === 409, 'Overlapping leave request rejected with HTTP 409 Conflict');
    const overlapData: any = await overlapRes.json();
    assert(overlapData.error.code === 'LEAVE_OVERLAP_DETECTED', 'Returns LEAVE_OVERLAP_DETECTED code');

    // -------------------------------------------------------------
    // 6. Security Boundaries & Approval Workflow
    // -------------------------------------------------------------
    console.log('\n6. Testing Review Workflow & Permissions:');
    // Regular employee cannot approve leave
    const empApproveRes = await fetch(`${BASE_URL}/leaves/requests/${requestId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        comments: 'Employee self-approval attempt',
      }),
    });
    assert(empApproveRes.status === 403, 'Employee forbidden from reviewing leave (HTTP 403)');

    // Admin approves the leave request
    const adminApproveRes = await fetch(`${BASE_URL}/leaves/requests/${requestId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        comments: 'Approved by Management. Have a wonderful time!',
      }),
    });
    assert(adminApproveRes.status === 200, 'Admin approves leave request (HTTP 200)');
    const adminApproveData: any = await adminApproveRes.json();
    assert(adminApproveData.data.status === 'APPROVED', 'Status updated to APPROVED');
    assert(adminApproveData.data.reviewerName === 'Leave Admin', 'Reviewer name captured');

    // Attempting to re-review an already approved request must return 409 Conflict
    const reReviewRes = await fetch(`${BASE_URL}/leaves/requests/${requestId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'REJECTED',
        comments: 'Conflicting change after approval',
      }),
    });
    assert(reReviewRes.status === 409, 'Re-reviewing approved leave returns HTTP 409 Conflict');

    // -------------------------------------------------------------
    // 7. Balance Deductions & Post-Approval Verification
    // -------------------------------------------------------------
    console.log('\n7. Verifying Balance Deductions:');
    const updatedBalancesRes = await fetch(`${BASE_URL}/leaves/balances`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const updatedBalancesData: any = await updatedBalancesRes.json();
    const updatedAnnual = updatedBalancesData.data.find((b: any) => b.leaveTypeId === annualLeaveTypeId);
    assert(updatedAnnual.usedDays === 3, 'Used annual leave days is now 3');
    assert(updatedAnnual.remainingDays === 11, 'Remaining annual leave days is now 11 (14 - 3)');

    // -------------------------------------------------------------
    // 8. Unlimited Unpaid Leave Support
    // -------------------------------------------------------------
    console.log('\n8. Testing Unlimited Unpaid Leave:');
    const unpaidSubmitRes = await fetch(`${BASE_URL}/leaves/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        leaveTypeId: unpaidLeaveTypeId,
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        reason: 'Sabbatical research project',
      }),
    });
    assert(unpaidSubmitRes.status === 201, 'Unpaid leave submission allowed with unlimited quota (HTTP 201)');
    const unpaidData: any = await unpaidSubmitRes.json();
    const unpaidRequestId = unpaidData.data.id;

    // Employee cancels own pending request
    const cancelRes = await fetch(`${BASE_URL}/leaves/requests/${unpaidRequestId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(cancelRes.status === 200, 'Employee can cancel own pending request (HTTP 200)');
    const cancelData: any = await cancelRes.json();
    assert(cancelData.data.status === 'CANCELLED', 'Request status changed to CANCELLED');

    console.log('\n========================================');
    console.log('ALL PHASE 5 TESTS PASSED! (20/20)');
    console.log('========================================\n');
  } finally {
    server.close();
  }
}

runPhase5Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  if (server) server.close();
  process.exit(1);
});
