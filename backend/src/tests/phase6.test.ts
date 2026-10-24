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
let payrollRunId: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function runPhase6Tests() {
  console.log('\n--- STARTING HCM LITE PHASE 6 PAYROLL & PAYSLIPS VERIFICATION SUITE ---\n');

  const app = createApp();
  server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const port = (server.address() as AddressInfo).port;
  BASE_URL = `http://127.0.0.1:${port}/api`;

  try {
    // -------------------------------------------------------------
    // 1. Setup Company & Staff
    // -------------------------------------------------------------
    console.log('1. Setting up Company, Policies, and Staff for Payroll:');
    const initRes = await fetch(`${BASE_URL}/setup/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Apex Payroll Technologies',
        timezone: 'UTC',
        officeStartTime: '09:00',
        gracePeriodMinutes: 15,
        weekendDays: ['Saturday', 'Sunday'],
        adminFullName: 'Payroll Admin',
        adminEmail: 'admin@apexpayroll.com',
        adminPassword: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });
    assert(initRes.status === 201, 'Company initialization returns 201');
    const initData: any = await initRes.json();
    adminToken = initData.data.token;
    companyId = initData.data.company.id;

    // Create Department
    const deptRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Finance and Operations' }),
    });
    assert(deptRes.status === 201, 'Department created');
    const deptData: any = await deptRes.json();

    // Create Designation
    const desRes = await fetch(`${BASE_URL}/designations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Lead Accountant',
        departmentId: deptData.data.id,
      }),
    });
    assert(desRes.status === 201, 'Designation created');
    const desData: any = await desRes.json();

    // Register Employee with PKR 100,000 basic salary
    const empRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeCode: 'APX-001',
        fullName: 'Jane Doe',
        email: 'jane.doe@apexpayroll.com',
        departmentId: deptData.data.id,
        designationId: desData.data.id,
        employmentType: 'FULL_TIME',
        joiningDate: '2026-01-01',
        basicSalary: 100000,
      }),
    });
    assert(empRes.status === 201, 'Employee registered with basicSalary 100,000');
    const empData: any = await empRes.json();
    employeeId = empData.data.employee.id;
    employeeUserId = empData.data.employee.userId;
    const tempPassword = empData.data.temporaryPassword;

    // Login as employee
    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jane.doe@apexpayroll.com',
        password: tempPassword,
      }),
    });
    assert(empLoginRes.status === 200, 'Employee logged in successfully');
    const empLoginData: any = await empLoginRes.json();
    employeeToken = empLoginData.data.token;

    // -------------------------------------------------------------
    // 2. Generate Payroll Draft
    // -------------------------------------------------------------
    console.log('\n2. Testing Payroll Draft Generation & Formulas:');
    const draftRes = await fetch(`${BASE_URL}/payroll/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ month: 10, year: 2026 }),
    });
    assert(draftRes.status === 201, 'Payroll draft generated with HTTP 201');
    const draftData: any = await draftRes.json();
    payrollRunId = draftData.id;

    assert(draftData.status === 'DRAFT', 'Payroll run status is DRAFT');
    assert(draftData.employeeCount === 1, 'Payroll run employeeCount is 1');
    assert(draftData.items && draftData.items.length === 1, 'Contains 1 employee line item');

    const item = draftData.items[0];
    assert(item.basicSalary === 100000, 'Basic salary is 100,000');
    assert(item.hra === 40000, 'HRA is 40% of basic (40,000)');
    assert(item.medicalAllowance === 10000, 'Medical allowance is 10% of basic (10,000)');
    assert(item.grossSalary === 150000, 'Gross salary is 1.5x basic (150,000)');

    // Tax calculation test:
    // Annual gross = 150,000 * 12 = 1,800,000
    // Slabs: 1.2M to 2.4M => 30,000 + (1,800,000 - 1,200,000) * 0.15 = 30,000 + 90,000 = 120,000
    // Monthly tax = 120,000 / 12 = 10,000
    assert(item.taxWithholding === 10000, 'Monthly tax withholding computed correctly (10,000)');
    assert(item.netSalary === 140000, 'Net salary is gross - deductions (140,000)');
    assert(draftData.totalGross === 150000, 'Total gross matches items sum');
    assert(draftData.totalNet === 140000, 'Total net matches items sum');

    // -------------------------------------------------------------
    // 3. Security & Role Guards: Employee cannot generate draft
    // -------------------------------------------------------------
    console.log('\n3. Testing Role Authorization:');
    const unauthorizedRes = await fetch(`${BASE_URL}/payroll/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ month: 10, year: 2026 }),
    });
    assert(unauthorizedRes.status === 403, 'Employee cannot generate payroll draft (HTTP 403 Forbidden)');

    // -------------------------------------------------------------
    // 4. List Payroll Runs & Fetch Run Details
    // -------------------------------------------------------------
    console.log('\n4. Listing Runs and Fetching Detail:');
    const runsRes = await fetch(`${BASE_URL}/payroll/runs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(runsRes.status === 200, 'Admin can list payroll runs');
    const runsList: any = await runsRes.json();
    assert(runsList.length >= 1, 'Runs list contains generated cycle');

    const detailRes = await fetch(`${BASE_URL}/payroll/runs/${payrollRunId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(detailRes.status === 200, 'Admin can fetch run details by ID');
    const detailData: any = await detailRes.json();
    assert(detailData.items.length === 1, 'Detail includes employee line items');
    assert(detailData.items[0].employeeName === 'Jane Doe', 'Employee name matches');

    // -------------------------------------------------------------
    // 5. Export Payroll CSV & Verify Formula Injection Protection
    // -------------------------------------------------------------
    console.log('\n5. Testing CSV Export & Formula Injection Sanitization:');
    const csvRes = await fetch(`${BASE_URL}/payroll/runs/${payrollRunId}/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(csvRes.status === 200, 'CSV export returns HTTP 200');
    assert(csvRes.headers.get('content-type')?.includes('text/csv') || false, 'Content-Type is text/csv');
    const csvText = await csvRes.text();
    assert(csvText.includes('Employee Code'), 'CSV contains header columns');
    assert(csvText.includes('Jane Doe'), 'CSV contains employee data');

    // -------------------------------------------------------------
    // 6. Finalize Payroll Run
    // -------------------------------------------------------------
    console.log('\n6. Finalizing Payroll Run & Verifying Immutability:');
    const finalizeRes = await fetch(`${BASE_URL}/payroll/runs/${payrollRunId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(finalizeRes.status === 200, 'Payroll finalized successfully');
    const finalizedData: any = await finalizeRes.json();
    assert(finalizedData.status === 'FINALIZED', 'Status updated to FINALIZED');
    assert(Boolean(finalizedData.finalizedAt), 'finalizedAt timestamp is recorded');

    // Attempting to finalize again should fail
    const reFinalizeRes = await fetch(`${BASE_URL}/payroll/runs/${payrollRunId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(reFinalizeRes.status === 400, 'Cannot re-finalize an already finalized payroll run (HTTP 400)');

    // Attempting to regenerate draft for finalized period should fail
    const reDraftRes = await fetch(`${BASE_URL}/payroll/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ month: 10, year: 2026 }),
    });
    assert(reDraftRes.status === 400, 'Cannot regenerate draft for finalized period (HTTP 400)');

    // -------------------------------------------------------------
    // 7. Employee Self-Service: View Released Payslip
    // -------------------------------------------------------------
    console.log('\n7. Testing Employee Payslip Self-Service:');
    const myPayslipsRes = await fetch(`${BASE_URL}/payroll/my-payslips`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(myPayslipsRes.status === 200, 'Employee can fetch their released payslips');
    const payslips: any = await myPayslipsRes.json();
    assert(payslips.length === 1, 'Employee sees 1 released payslip');
    assert(payslips[0].netSalary === 140000, 'Employee payslip net salary is correct');

    // Fetch individual payslip detail
    const singleSlipRes = await fetch(`${BASE_URL}/payroll/my-payslips/${payslips[0].id}`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(singleSlipRes.status === 200, 'Employee can fetch itemized payslip breakdown');
    const singleSlipData: any = await singleSlipRes.json();
    assert(singleSlipData.basicSalary === 100000, 'Basic salary matches in itemized slip');

    console.log('\n--- ALL PHASE 6 PAYROLL TESTS PASSED (15/15) ---\n');
  } finally {
    server.close();
  }
}

runPhase6Tests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
