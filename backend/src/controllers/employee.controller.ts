import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';
import {
  EmployeeRegisterInput,
  EmployeeUpdateInput,
  EmployeeStatusUpdateInput,
} from '@hcm-lite/shared';
import { auditService } from '../services/audit.service';

export async function listEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userRole = req.user!.role;
    const canViewSalary = userRole === 'ADMIN' || userRole === 'HR';

    const search = req.query.search as string;
    const departmentId = req.query.departmentId as string;
    const designationId = req.query.designationId as string;
    const employmentStatus = req.query.employmentStatus as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const result = await storeService.listEmployees(companyId, {
      search,
      departmentId,
      designationId,
      employmentStatus,
      page,
      pageSize,
      sortBy,
      sortOrder,
      canViewSalary,
    });

    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, 'FETCH_EMPLOYEES_ERROR', err.message || 'Failed to list employees', 500);
  }
}

export async function getEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const userRole = req.user!.role;
    const currentUserId = req.user!.id;

    // Check if employee is requesting self or someone else
    let employee = await storeService.getEmployeeById(companyId, id);
    if (!employee) {
      // If id is "me", find by userId
      if (id === 'me') {
        employee = await storeService.getEmployeeByUserId(companyId, currentUserId);
      }
    }

    if (!employee) {
      sendError(res, 'NOT_FOUND', 'Employee record not found', 404);
      return;
    }

    // Role boundary: An Employee can only view their own profile!
    if (userRole === 'EMPLOYEE' && employee.userId !== currentUserId) {
      sendError(res, 'FORBIDDEN', 'Employees are not authorized to view other employee profiles.', 403);
      return;
    }

    // Sanitize salary if not authorized
    if (userRole !== 'ADMIN' && userRole !== 'HR' && employee.userId !== currentUserId) {
      delete employee.basicSalary;
    }

    sendSuccess(res, employee);
  } catch (err: any) {
    sendError(res, 'GET_EMPLOYEE_ERROR', err.message, 500);
  }
}

export async function registerEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const actorId = req.user!.id;
    const body: EmployeeRegisterInput = req.body;

    const result = await storeService.registerEmployee(companyId, actorId, body);
    sendSuccess(res, result, 'Employee registered and user account created successfully', 201);
  } catch (err: any) {
    sendError(res, 'REGISTER_EMPLOYEE_ERROR', err.message, 400);
  }
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const actorId = req.user!.id;
    const userRole = req.user!.role;
    const body: EmployeeUpdateInput = req.body;

    // Employees cannot edit salaries or department/designation
    if (userRole === 'EMPLOYEE') {
      delete body.basicSalary;
    }

    const updated = await storeService.updateEmployee(companyId, id, actorId, body);
    sendSuccess(res, updated, 'Employee profile updated successfully');
  } catch (err: any) {
    sendError(res, 'UPDATE_EMPLOYEE_ERROR', err.message, 400);
  }
}

export async function updateEmployeeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const actorId = req.user!.id;
    const body: EmployeeStatusUpdateInput = req.body;

    const updated = await storeService.updateEmployeeStatus(companyId, id, actorId, body);
    sendSuccess(
      res,
      updated,
      `Employee status set to ${body.employmentStatus} and account ${body.isActive ? 'activated' : 'deactivated'}`
    );
  } catch (err: any) {
    sendError(res, 'UPDATE_EMPLOYEE_STATUS_ERROR', err.message, 400);
  }
}

// -------------------------------------------------------------
// CSV IMPORT & EXPORT
// -------------------------------------------------------------
export interface RawCsvRow {
  employeeCode?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  departmentName?: string;
  designationName?: string;
  employmentType?: string;
  joiningDate?: string;
  basicSalary?: string | number;
}

export async function importCsvPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const rows: RawCsvRow[] = req.body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      sendError(res, 'INVALID_CSV', 'CSV file contains no data rows.', 400);
      return;
    }

    // Limit maximum rows
    if (rows.length > 500) {
      sendError(res, 'FILE_TOO_LARGE', 'CSV import exceeds maximum limit of 500 rows per batch.', 400);
      return;
    }

    const [deptRes, desigRes, existingEmployees] = await Promise.all([
      storeService.listDepartments(companyId, { pageSize: 1000 }),
      storeService.listDesignations(companyId, { pageSize: 1000 }),
      storeService.listEmployees(companyId, { pageSize: 10000 }),
    ]);

    const depts = deptRes.items;
    const desigs = desigRes.items;
    const existingCodes = new Set(existingEmployees.items.map((e) => e.employeeCode.toLowerCase()));
    const existingEmails = new Set(existingEmployees.items.map((e) => e.email.toLowerCase()));

    const seenCodesInBatch = new Set<string>();
    const seenEmailsInBatch = new Set<string>();

    const previewResults = rows.map((row, idx) => {
      const rowNum = idx + 1;
      const errors: string[] = [];

      const code = (row.employeeCode || '').trim();
      const name = (row.fullName || '').trim();
      const email = (row.email || '').trim().toLowerCase();
      const deptName = (row.departmentName || '').trim();
      const desigName = (row.designationName || '').trim();
      const joiningDate = (row.joiningDate || '').trim();
      const salary = parseFloat(String(row.basicSalary || '0'));

      // Validate required fields
      if (!code) errors.push('Employee ID/Code is required');
      else if (existingCodes.has(code.toLowerCase())) errors.push(`Employee code "${code}" already exists`);
      else if (seenCodesInBatch.has(code.toLowerCase())) errors.push(`Duplicate code "${code}" within CSV file`);
      else seenCodesInBatch.add(code.toLowerCase());

      if (!name) errors.push('Full name is required');

      if (!email) errors.push('Email is required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');
      else if (existingEmails.has(email)) errors.push(`Email "${email}" is already registered`);
      else if (seenEmailsInBatch.has(email)) errors.push(`Duplicate email "${email}" within CSV file`);
      else seenEmailsInBatch.add(email);

      // Validate Department
      const matchedDept = depts.find((d) => d.name.toLowerCase() === deptName.toLowerCase());
      if (!deptName) errors.push('Department name is required');
      else if (!matchedDept) errors.push(`Department "${deptName}" not found`);
      else if (!matchedDept.isActive) errors.push(`Department "${deptName}" is deactivated`);

      // Validate Designation
      const matchedDesig = desigs.find((d) => d.name.toLowerCase() === desigName.toLowerCase());
      if (!desigName) errors.push('Designation name is required');
      else if (!matchedDesig) errors.push(`Designation "${desigName}" not found`);
      else if (!matchedDesig.isActive) errors.push(`Designation "${desigName}" is deactivated`);

      // Validate Joining Date
      if (!joiningDate) errors.push('Joining date is required');
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) errors.push('Joining date must be YYYY-MM-DD');

      // Validate Salary
      if (isNaN(salary) || salary < 0) errors.push('Basic salary must be a non-negative number');

      return {
        rowNumber: rowNum,
        employeeCode: code,
        fullName: name,
        email,
        isValid: errors.length === 0,
        errors,
      };
    });

    const validRows = previewResults.filter((r) => r.isValid).length;
    const invalidRows = previewResults.length - validRows;

    sendSuccess(res, {
      totalRows: previewResults.length,
      validRows,
      invalidRows,
      rows: previewResults,
    });
  } catch (err: any) {
    sendError(res, 'CSV_PREVIEW_ERROR', err.message, 400);
  }
}

export async function importCsvCommit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const actorId = req.user!.id;
    const rows: RawCsvRow[] = req.body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      sendError(res, 'INVALID_CSV', 'No rows provided to commit.', 400);
      return;
    }

    const [deptRes, desigRes] = await Promise.all([
      storeService.listDepartments(companyId, { pageSize: 1000 }),
      storeService.listDesignations(companyId, { pageSize: 1000 }),
    ]);

    const depts = deptRes.items;
    const desigs = desigRes.items;

    let importedCount = 0;
    const errors: { row: number; code: string; message: string }[] = [];
    const temporaryPasswords: { email: string; employeeCode: string; temporaryPassword: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      try {
        const code = (row.employeeCode || '').trim();
        const name = (row.fullName || '').trim();
        const email = (row.email || '').trim().toLowerCase();
        const deptName = (row.departmentName || '').trim();
        const desigName = (row.designationName || '').trim();
        const joiningDate = (row.joiningDate || '').trim();
        const salary = parseFloat(String(row.basicSalary || '0')) || 0;

        const matchedDept = depts.find((d) => d.name.toLowerCase() === deptName.toLowerCase());
        const matchedDesig = desigs.find((d) => d.name.toLowerCase() === desigName.toLowerCase());

        if (!matchedDept || !matchedDept.isActive) {
          throw new Error(`Invalid or inactive department "${deptName}"`);
        }
        if (!matchedDesig || !matchedDesig.isActive) {
          throw new Error(`Invalid or inactive designation "${desigName}"`);
        }

        const validTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
        const empType = validTypes.includes(row.employmentType || '') ? (row.employmentType as any) : 'FULL_TIME';

        const result = await storeService.registerEmployee(companyId, actorId, {
          fullName: name,
          email,
          employeeCode: code,
          departmentId: matchedDept.id,
          designationId: matchedDesig.id,
          employmentType: empType,
          joiningDate,
          basicSalary: salary,
          phone: row.phone || '',
          address: row.address || '',
        });

        importedCount++;
        if (result.temporaryPassword) {
          temporaryPasswords.push({
            email,
            employeeCode: code,
            temporaryPassword: result.temporaryPassword,
          });
        }
      } catch (rowErr: any) {
        errors.push({
          row: rowNum,
          code: row.employeeCode || '',
          message: rowErr.message,
        });
      }
    }

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'CSV_IMPORT_EXECUTED',
      entityType: 'EmployeeBatch',
      afterData: { importedCount, errorCount: errors.length },
    });

    sendSuccess(res, {
      importedCount,
      skippedCount: errors.length,
      errors,
      temporaryPasswords,
    });
  } catch (err: any) {
    sendError(res, 'CSV_COMMIT_ERROR', err.message, 400);
  }
}

export async function exportEmployeesCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const actorId = req.user!.id;
    const userRole = req.user!.role;
    const canViewSalary = userRole === 'ADMIN' || userRole === 'HR';

    const search = req.query.search as string;
    const departmentId = req.query.departmentId as string;
    const designationId = req.query.designationId as string;
    const employmentStatus = req.query.employmentStatus as string;

    const result = await storeService.listEmployees(companyId, {
      search,
      departmentId,
      designationId,
      employmentStatus,
      pageSize: 5000,
      canViewSalary,
    });

    // Escape cell values to prevent formula injection (=, +, -, @)
    const sanitizeCsvCell = (value: any): string => {
      if (value === null || value === undefined) return '""';
      let str = String(value);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Employee Code',
      'Full Name',
      'Email',
      'Phone',
      'Department',
      'Designation',
      'Employment Type',
      'Joining Date',
      'Employment Status',
      ...(canViewSalary ? ['Basic Salary'] : []),
    ];

    const lines: string[] = [];
    lines.push(headers.map(sanitizeCsvCell).join(','));

    for (const emp of result.items) {
      const row = [
        emp.employeeCode,
        emp.fullName,
        emp.email,
        emp.phone || '',
        emp.departmentName || '',
        emp.designationName || '',
        emp.employmentType,
        emp.joiningDate,
        emp.employmentStatus,
        ...(canViewSalary ? [emp.basicSalary ?? ''] : []),
      ];
      lines.push(row.map(sanitizeCsvCell).join(','));
    }

    const csvContent = lines.join('\r\n');

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'EMPLOYEES_EXPORTED_CSV',
      entityType: 'Employee',
      afterData: { recordCount: result.items.length },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hcm_employees_export.csv"');
    res.status(200).send(csvContent);
  } catch (err: any) {
    sendError(res, 'CSV_EXPORT_ERROR', err.message, 500);
  }
}
