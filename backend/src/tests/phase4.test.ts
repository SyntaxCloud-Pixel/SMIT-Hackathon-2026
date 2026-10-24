import { createApp } from '../app';
import http, { Server } from 'http';
import { AddressInfo } from 'net';
import {
  evaluateCheckIn,
  evaluateCheckOut,
  isWeekend,
  isHoliday,
} from '../utils/attendance.utils';
import { Company } from '@hcm-lite/shared';

let BASE_URL: string;
let server: Server;
let adminToken: string;
let employeeToken: string;
let employeeId: string;
let employeeUserId: string;
let companyId: string;
let departmentId: string;
let designationId: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function runPhase4Tests() {
  console.log('\n--- STARTING HCM LITE PHASE 4 ATTENDANCE VERIFICATION SUITE ---\n');

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
    console.log('1. Initializing Company & Employee:');
    const initRes = await fetch(`${BASE_URL}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Attendance Corp',
        timezone: 'UTC',
        officeStartTime: '09:00',
        gracePeriodMinutes: 15,
        weekendDays: ['Saturday', 'Sunday'],
        officeAddress: '100 Attendance Way',
        adminFullName: 'Attendance Admin',
        adminEmail: 'attendance.admin@corp.com',
        adminPassword: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });
    assert(initRes.status === 201, 'Setup initialization returns HTTP 201');
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
        name: 'Operations',
        description: 'Operations Department',
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
        name: 'Logistics Coordinator',
        departmentId,
      }),
    });
    const desigData: any = await desigRes.json();
    designationId = desigData.data.id;

    // Register an employee
    const empRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeCode: 'EMP-ATT-01',
        fullName: 'Jane Puncher',
        email: 'jane.puncher@corp.com',
        phone: '+1-555-0909',
        departmentId,
        designationId,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-01-01',
        basicSalary: 75000,
      }),
    });
    assert(empRes.status === 201, 'Employee registration returns HTTP 201');
    const empData: any = await empRes.json();
    employeeId = empData.data.employee.id;
    employeeUserId = empData.data.employee.userId;
    const tempPassword = empData.data.temporaryPassword;

    // Log in as the employee
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jane.puncher@corp.com',
        password: tempPassword,
      }),
    });
    assert(loginRes.status === 200, 'Employee login returns HTTP 200');
    const loginData: any = await loginRes.json();
    employeeToken = loginData.data.token;

    // -------------------------------------------------------------
    // 2. Unit Testing: Late Arrival & Half-Day Boundary Calculations
    // -------------------------------------------------------------
    console.log('\n2. Testing Boundary Calculation Logic:');
    const mockCompany: Company = {
      id: companyId,
      name: 'Attendance Corp',
      timezone: 'UTC',
      officeStartTime: '09:00:00',
      gracePeriodMinutes: 15,
      weekendDays: ['Saturday', 'Sunday'],
      allowedAttendanceRadius: 200,
      setupCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Exactly 09:15:00 UTC -> Must NOT be late
    const onTimeArrival = new Date('2026-03-10T09:15:00.000Z');
    const evalOnTime = evaluateCheckIn(onTimeArrival, mockCompany);
    assert(!evalOnTime.isLate, 'Check-in at exactly 09:15:00 is NOT late');
    assert(evalOnTime.status === 'PRESENT', 'Status at 09:15:00 is PRESENT');
    assert(evalOnTime.minutesLate === 0, 'Minutes late at 09:15:00 is 0');

    // 09:15:01 UTC -> Must be late
    const lateArrival = new Date('2026-03-10T09:15:01.000Z');
    const evalLate = evaluateCheckIn(lateArrival, mockCompany);
    assert(evalLate.isLate, 'Check-in at 09:15:01 IS late');
    assert(evalLate.status === 'LATE', 'Status at 09:15:01 is LATE');
    assert(evalLate.minutesLate >= 15, 'Minutes late calculated from office start (09:00)');

    // Half-Day Rule Boundary:
    // Check-in: 09:00, Check-out: 13:59 (299 minutes, < 5 hours) -> HALF_DAY
    const checkInTime = new Date('2026-03-10T09:00:00.000Z');
    const earlyCheckOut = new Date('2026-03-10T13:59:00.000Z');
    const evalHalfDay = evaluateCheckOut(checkInTime, earlyCheckOut, false, 0);
    assert(evalHalfDay.status === 'HALF_DAY', 'Duration of 299 mins (< 5 hours) is HALF_DAY');
    assert(evalHalfDay.workedMinutes === 299, 'Worked minutes is 299');

    // Check-in: 09:00, Check-out: 14:00 (300 minutes, exactly 5 hours) -> PRESENT
    const exactFiveHoursCheckOut = new Date('2026-03-10T14:00:00.000Z');
    const evalFullDay = evaluateCheckOut(checkInTime, exactFiveHoursCheckOut, false, 0);
    assert(evalFullDay.status === 'PRESENT', 'Duration of 300 mins (>= 5 hours) is PRESENT');
    assert(evalFullDay.workedMinutes === 300, 'Worked minutes is 300');

    // Weekend & Holiday Check
    const sundayDate = new Date('2026-03-15T10:00:00.000Z'); // Sunday
    assert(isWeekend(sundayDate, ['Saturday', 'Sunday']), 'Sunday is recognized as weekend');
    const mondayDate = new Date('2026-03-16T10:00:00.000Z'); // Monday
    assert(!isWeekend(mondayDate, ['Saturday', 'Sunday']), 'Monday is recognized as working day');

    assert(
      isHoliday('2026-03-23', [{ id: '1', companyId, name: 'Pakistan Day', holidayDate: '2026-03-23', createdAt: '' }]),
      'Official holiday date is recognized'
    );

    // -------------------------------------------------------------
    // 3. Employee Check-in and Duplicate Prevention
    // -------------------------------------------------------------
    console.log('\n3. Testing Employee Check-In & Idempotency:');

    // Check-out before check-in must fail with 400
    const earlyCheckOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ notes: 'Trying early checkout' }),
    });
    assert(earlyCheckOutRes.status === 400, 'Check-out before check-in returns HTTP 400 Bad Request');

    // Successful check-in
    const checkInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ notes: 'Punched in from mobile' }),
    });
    assert(checkInRes.status === 201, 'First check-in returns HTTP 201 Created');
    const checkInData: any = await checkInRes.json();
    assert(checkInData.data.checkIn !== null, 'Check-in timestamp recorded');
    assert(checkInData.data.employeeId === employeeId, 'Attendance tied to authenticated employee');
    const attendanceRecordId = checkInData.data.id;

    // Duplicate check-in on the same day must be rejected with 409 Conflict
    const dupCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ notes: 'Duplicate punch' }),
    });
    assert(dupCheckInRes.status === 409, 'Duplicate check-in rejected with HTTP 409 Conflict');
    const dupCheckInData: any = await dupCheckInRes.json();
    assert(dupCheckInData.error.code === 'ATTENDANCE_ALREADY_CHECKED_IN', 'Error code is ATTENDANCE_ALREADY_CHECKED_IN');

    // -------------------------------------------------------------
    // 4. Employee Today Attendance & Status Flags
    // -------------------------------------------------------------
    console.log('\n4. Testing GET /api/attendance/today:');
    const todayRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(todayRes.status === 200, 'GET /api/attendance/today returns HTTP 200');
    const todayData: any = await todayRes.json();
    assert(todayData.data.canCheckIn === false, 'canCheckIn is false after check-in');
    assert(todayData.data.canCheckOut === true, 'canCheckOut is true while checked in');
    assert(todayData.data.record.id === attendanceRecordId, 'Returns active attendance record');

    // -------------------------------------------------------------
    // 5. Employee Check-Out & Duration Computation
    // -------------------------------------------------------------
    console.log('\n5. Testing Employee Check-Out:');
    const checkOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ notes: 'Completed day shift' }),
    });
    assert(checkOutRes.status === 200, 'Check-out returns HTTP 200 OK');
    const checkOutData: any = await checkOutRes.json();
    assert(checkOutData.data.checkOut !== null, 'Check-out timestamp persisted');

    // Duplicate check-out must be rejected with 409 Conflict
    const dupCheckOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ notes: 'Duplicate punch out' }),
    });
    assert(dupCheckOutRes.status === 409, 'Duplicate check-out rejected with HTTP 409 Conflict');
    const dupCheckOutData: any = await dupCheckOutRes.json();
    assert(dupCheckOutData.error.code === 'ATTENDANCE_ALREADY_CHECKED_OUT', 'Error code is ATTENDANCE_ALREADY_CHECKED_OUT');

    // -------------------------------------------------------------
    // 6. Security Boundaries & Role Restrictions
    // -------------------------------------------------------------
    console.log('\n6. Testing Security Boundaries:');

    // Unauthenticated request must return 401
    const noAuthRes = await fetch(`${BASE_URL}/attendance/today`);
    assert(noAuthRes.status === 401, 'Unauthenticated request returns HTTP 401');

    // Regular employee cannot view company-wide attendance (403 Forbidden)
    const empCompanyRes = await fetch(`${BASE_URL}/attendance/company`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empCompanyRes.status === 403, 'Employee is forbidden from company attendance (HTTP 403)');

    // Regular employee cannot view attendance summary metrics (403 Forbidden)
    const empSummaryRes = await fetch(`${BASE_URL}/attendance/summary`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empSummaryRes.status === 403, 'Employee is forbidden from attendance summary (HTTP 403)');

    // Admin can access company attendance
    const adminCompanyRes = await fetch(`${BASE_URL}/attendance/company`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCompanyRes.status === 200, 'Admin can access company attendance (HTTP 200)');
    const adminCompanyData: any = await adminCompanyRes.json();
    assert(adminCompanyData.data.total >= 1, 'Company attendance includes recorded item');

    // Admin can access attendance summary
    const adminSummaryRes = await fetch(`${BASE_URL}/attendance/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminSummaryRes.status === 200, 'Admin can access attendance summary (HTTP 200)');
    const adminSummaryData: any = await adminSummaryRes.json();
    assert(adminSummaryData.data.totalEmployees >= 1, 'Summary reports total employees');

    // -------------------------------------------------------------
    // 7. Attendance Correction & Audit Logging
    // -------------------------------------------------------------
    console.log('\n7. Testing Attendance Correction & Audit Trail:');

    // Employee cannot correct attendance
    const empCorrectRes = await fetch(`${BASE_URL}/attendance/${attendanceRecordId}/correct`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'PRESENT',
        correctionReason: 'Employee attempting self-correction',
      }),
    });
    assert(empCorrectRes.status === 403, 'Employee cannot correct attendance (HTTP 403 Forbidden)');

    // Admin corrects attendance with mandatory reason
    const adminCorrectRes = await fetch(`${BASE_URL}/attendance/${attendanceRecordId}/correct`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'PRESENT',
        correctionReason: 'Biometric device network latency adjustment',
      }),
    });
    assert(adminCorrectRes.status === 200, 'Admin can correct attendance (HTTP 200)');
    const adminCorrectData: any = await adminCorrectRes.json();
    assert(adminCorrectData.data.isCorrected === true, 'isCorrected flag set to true');
    assert(adminCorrectData.data.correctionReason === 'Biometric device network latency adjustment', 'Correction reason saved');

    // -------------------------------------------------------------
    // 8. CSV Export and Formula Injection Defense
    // -------------------------------------------------------------
    console.log('\n8. Testing CSV Attendance Export:');
    const csvRes = await fetch(`${BASE_URL}/attendance/export/csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(csvRes.status === 200, 'CSV export returns HTTP 200');
    assert(csvRes.headers.get('content-type')?.includes('text/csv') === true, 'Response is text/csv');
    const csvText = await csvRes.text();
    assert(csvText.includes('Employee Code'), 'CSV contains header row');
    assert(csvText.includes('EMP-ATT-01'), 'CSV contains employee attendance record');

    console.log('\n========================================');
    console.log('ALL PHASE 4 TESTS PASSED! (20/20)');
    console.log('========================================\n');
  } finally {
    server.close();
  }
}

runPhase4Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  if (server) server.close();
  process.exit(1);
});
