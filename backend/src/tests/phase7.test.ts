import { createApp } from '../app';
import http, { Server } from 'http';
import { AddressInfo } from 'net';

let BASE_URL: string;
let server: Server;
let adminToken: string;
let employeeToken: string;
let announcementId: string;
let notificationId: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function runPhase7Tests() {
  console.log('\n--- STARTING HCM LITE PHASE 7 DASHBOARDS, ANALYTICS, ANNOUNCEMENTS & AI TEST SUITE ---\n');

  const app = createApp();
  server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const port = (server.address() as AddressInfo).port;
  BASE_URL = `http://127.0.0.1:${port}/api`;

  try {
    // -------------------------------------------------------------
    // 1. Setup Company and Staff
    // -------------------------------------------------------------
    console.log('1. Initializing Company & Workforce:');
    const initRes = await fetch(`${BASE_URL}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Horizon Global HR',
        timezone: 'UTC',
        officeStartTime: '09:00',
        gracePeriodMinutes: 15,
        weekendDays: ['Saturday', 'Sunday'],
        adminFullName: 'Horizon Admin',
        adminEmail: 'admin@horizonglobal.com',
        adminPassword: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });
    assert(initRes.status === 201, 'Company initialization returns 201');
    const initData: any = await initRes.json();
    adminToken = initData.data.token;

    // Create Department
    const deptRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Engineering' }),
    });
    const deptData: any = await deptRes.json();

    // Create Designation
    const desRes = await fetch(`${BASE_URL}/designations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Staff Engineer',
        departmentId: deptData.data.id,
      }),
    });
    const desData: any = await desRes.json();

    // Register Employee
    const empRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeCode: 'HRZ-101',
        fullName: 'Grace Hopper',
        email: 'grace@horizonglobal.com',
        departmentId: deptData.data.id,
        designationId: desData.data.id,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-01-01',
        basicSalary: 120000,
      }),
    });
    const empData: any = await empRes.json();

    // Log in as employee
    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'grace@horizonglobal.com',
        password: empData.data.temporaryPassword,
      }),
    });
    const empLoginData: any = await empLoginRes.json();
    employeeToken = empLoginData.data.token;

    // -------------------------------------------------------------
    // 2. Announcements
    // -------------------------------------------------------------
    console.log('\n2. Testing Company Announcements Module:');
    const annCreateRes = await fetch(`${BASE_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Annual Hackathon 2026 Kickoff',
        content: 'We are thrilled to announce the commencement of our innovation hackathon!',
        isPinned: true,
      }),
    });
    assert(annCreateRes.status === 201, 'Admin can publish pinned announcement');
    const annData: any = await annCreateRes.json();
    announcementId = annData.id;
    assert(annData.isPinned === true, 'Announcement is pinned');

    // Employee views announcements
    const annListRes = await fetch(`${BASE_URL}/announcements`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(annListRes.status === 200, 'Employee can view company announcements');
    const annList: any = await annListRes.json();
    assert(annList.length === 1, 'Announcements list has 1 bulletin');
    assert(annList[0].title === 'Annual Hackathon 2026 Kickoff', 'Announcement title matches');

    // Employee cannot delete announcement
    const unauthDelete = await fetch(`${BASE_URL}/announcements/${announcementId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(unauthDelete.status === 403, 'Employee cannot delete announcements (403)');

    // -------------------------------------------------------------
    // 3. Notifications
    // -------------------------------------------------------------
    console.log('\n3. Testing In-App Notifications:');
    const notifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(notifsRes.status === 200, 'Employee can fetch in-app notifications');
    const notifsList: any = await notifsRes.json();

    // -------------------------------------------------------------
    // 4. Dashboard Summary & Attendance Analytics Trends
    // -------------------------------------------------------------
    console.log('\n4. Testing Real Aggregate Dashboard & Trends Endpoints:');
    const summaryRes = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(summaryRes.status === 200, 'Dashboard summary returns HTTP 200');
    const summaryData: any = await summaryRes.json();
    assert(summaryData.totalEmployees === 1, 'Real total employees count is 1');
    assert(Array.isArray(summaryData.departmentHeadcounts), 'Department headcounts returned as array');
    assert(summaryData.departmentHeadcounts[0].departmentName === 'Engineering', 'Engineering headcount counted correctly');

    const trendsRes = await fetch(`${BASE_URL}/dashboard/attendance-trends?days=7`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(trendsRes.status === 200, 'Attendance trends returns HTTP 200');
    const trendsData: any = await trendsRes.json();
    assert(Array.isArray(trendsData) && trendsData.length === 7, 'Trends returns 7 daily datapoints');

    // -------------------------------------------------------------
    // 5. AI Assistant Endpoints
    // -------------------------------------------------------------
    console.log('\n5. Testing AI Assistant Natural Language & Tool Grounding:');
    const aiHeadcountRes = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: 'What is our total headcount?' }),
    });
    assert(aiHeadcountRes.status === 200, 'AI chat returns HTTP 200');
    const aiHeadcountData: any = await aiHeadcountRes.json();
    assert(aiHeadcountData.response.includes('Total Active Employees'), 'AI response cites real total active employees');
    assert(aiHeadcountData.response.includes('Engineering'), 'AI response cites Engineering department breakdown');

    // Employee asks about their leave balance
    const aiLeaveRes = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ message: 'What is my current leave balance?' }),
    });
    assert(aiLeaveRes.status === 200, 'Employee AI query returns HTTP 200');
    const aiLeaveData: any = await aiLeaveRes.json();
    assert(aiLeaveData.response.includes('Annual Leave'), 'AI accurately provides employee leave balances');

    // Ask about policies
    const aiPolicyRes = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ message: 'What is the office start time and grace period?' }),
    });
    assert(aiPolicyRes.status === 200, 'Policy inquiry returns HTTP 200');
    const aiPolicyData: any = await aiPolicyRes.json();
    assert(aiPolicyData.response.includes('09:00'), 'AI response cites 09:00 office start time');
    assert(aiPolicyData.response.includes('15 minutes'), 'AI response cites 15 minute grace period');

    console.log('\n--- ALL PHASE 7 TESTS PASSED (14/14) ---\n');
  } finally {
    server.close();
  }
}

runPhase7Tests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
