import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDbPool } from '../config/database';
import { logger } from '../utils/logger';
import {
  Company,
  UserSummary,
  Department,
  Designation,
  EmployeeProfile,
  LeaveType,
  Holiday,
  CompanySetupRequest,
  UserRole,
  PaginatedResult,
  EmployeeRegisterInput,
  EmployeeUpdateInput,
  EmployeeStatusUpdateInput,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  AttendanceCorrectionInput,
  AttendanceMonthlyReport,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveBalanceSummary,
  WorkingDaysEstimateResponse,
  LeaveRequestSubmitInput,
  PayrollRun,
  PayrollItem,
  PayrollRunDetail,
  PayrollStatus,
  Announcement,
  AppNotification,
  DashboardSummary,
  AttendanceAnalyticsTrend,
} from '@hcm-lite/shared';
import { computeEmployeeSalary } from '../utils/payroll.utils';
import { auditService } from './audit.service';
import {
  evaluateCheckIn,
  evaluateCheckOut,
  getCompanyLocalDateString,
  isWeekend,
  isHoliday,
} from '../utils/attendance.utils';
import { calculateWorkingDays, hasLeaveOverlap } from '../utils/leave.utils';

// In-memory data store for development/testing when PostgreSQL is not connected
interface InternalUserRecord extends UserSummary {
  passwordHash: string;
}

let inMemoryCompany: Company | null = null;
const inMemoryUsers: InternalUserRecord[] = [];
const inMemoryLeaveTypes: LeaveType[] = [];
const inMemoryDepartments: Department[] = [];
const inMemoryDesignations: Designation[] = [];
const inMemoryEmployees: EmployeeProfile[] = [];
const inMemoryHolidays: Holiday[] = [];
const inMemoryAttendances: AttendanceRecord[] = [];
const inMemoryLeaveRequests: LeaveRequest[] = [];
const inMemoryPayrollRuns: PayrollRun[] = [];
const inMemoryPayrollItems: PayrollItem[] = [];
const inMemoryAnnouncements: Announcement[] = [];
const inMemoryNotifications: AppNotification[] = [];

// Default Leave Policy Quotas
export const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave', quota: 14, isPaid: true },
  { name: 'Sick Leave', quota: 8, isPaid: true },
  { name: 'Casual Leave', quota: 10, isPaid: true },
  { name: 'Unpaid Leave', quota: 0, isPaid: false },
];

export const storeService = {
  // -------------------------------------------------------------
  // COMPANY & SETUP
  // -------------------------------------------------------------
  async isSetupCompleted(): Promise<{ completed: boolean; company: Company | null }> {
    const pool = getDbPool();
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT 
            id, name, timezone, office_start_time AS "officeStartTime",
            grace_period_minutes AS "gracePeriodMinutes", weekend_days AS "weekendDays",
            office_address AS "officeAddress", office_latitude AS "officeLatitude",
            office_longitude AS "officeLongitude", allowed_attendance_radius AS "allowedAttendanceRadius",
            setup_completed AS "setupCompleted", created_at AS "createdAt", updated_at AS "updatedAt"
           FROM companies 
           WHERE setup_completed = true 
           LIMIT 1`
        );
        if (result.rows.length > 0) {
          const c = result.rows[0];
          return {
            completed: true,
            company: {
              ...c,
              weekendDays: Array.isArray(c.weekendDays) ? c.weekendDays : JSON.parse(c.weekendDays || '[]'),
            },
          };
        }
        return { completed: false, company: null };
      } catch (err: any) {
        logger.error('Failed to query setup status from database', { error: err.message });
      }
    }

    if (inMemoryCompany && inMemoryCompany.setupCompleted) {
      return { completed: true, company: inMemoryCompany };
    }
    return { completed: false, company: null };
  },

  async initializeCompany(data: CompanySetupRequest): Promise<{ company: Company; admin: UserSummary }> {
    const { completed } = await this.isSetupCompleted();
    if (completed) {
      throw new Error('SETUP_ALREADY_COMPLETED: Initial company setup has already been completed.');
    }

    const pool = getDbPool();
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const compResult = await client.query(
          `INSERT INTO companies 
            (name, timezone, office_start_time, grace_period_minutes, weekend_days, office_address, office_latitude, office_longitude, allowed_attendance_radius, setup_completed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
           RETURNING id, name, timezone, office_start_time AS "officeStartTime", grace_period_minutes AS "gracePeriodMinutes", weekend_days AS "weekendDays", office_address AS "officeAddress", office_latitude AS "officeLatitude", office_longitude AS "officeLongitude", allowed_attendance_radius AS "allowedAttendanceRadius", setup_completed AS "setupCompleted", created_at AS "createdAt", updated_at AS "updatedAt"`,
          [
            data.companyName,
            data.timezone || 'UTC',
            data.officeStartTime || '09:00:00',
            data.gracePeriodMinutes ?? 15,
            JSON.stringify(data.weekendDays || ['Saturday', 'Sunday']),
            data.officeAddress || null,
            data.officeLatitude || null,
            data.officeLongitude || null,
            data.allowedAttendanceRadius ?? 200,
          ]
        );
        const company: Company = {
          ...compResult.rows[0],
          weekendDays: Array.isArray(compResult.rows[0].weekendDays)
            ? compResult.rows[0].weekendDays
            : JSON.parse(compResult.rows[0].weekendDays || '[]'),
        };

        const adminResult = await client.query(
          `INSERT INTO users 
            (company_id, email, password_hash, full_name, role, is_active, must_change_password)
           VALUES ($1, $2, $3, $4, 'ADMIN', true, false)
           RETURNING id, company_id AS "companyId", email, full_name AS "fullName", role, is_active AS "isActive", must_change_password AS "mustChangePassword", created_at AS "createdAt"`,
          [company.id, data.adminEmail.toLowerCase(), passwordHash, data.adminFullName]
        );
        const admin: UserSummary = adminResult.rows[0];

        for (const lt of DEFAULT_LEAVE_TYPES) {
          await client.query(
            `INSERT INTO leave_types (company_id, name, annual_quota, is_paid, is_active)
             VALUES ($1, $2, $3, $4, true)`,
            [company.id, lt.name, lt.quota, lt.isPaid]
          );
        }

        await client.query('COMMIT');

        await auditService.log({
          companyId: company.id,
          actorUserId: admin.id,
          action: 'COMPANY_INITIALIZED',
          entityType: 'Company',
          entityId: company.id,
          afterData: {
            companyName: company.name,
            adminEmail: admin.email,
            timezone: company.timezone,
          },
        });

        return { company, admin };
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Database transaction failed during company initialization', err);
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory fallback
    const companyId = `comp-${Date.now()}`;
    const newCompany: Company = {
      id: companyId,
      name: data.companyName,
      timezone: data.timezone || 'UTC',
      officeStartTime: data.officeStartTime || '09:00',
      gracePeriodMinutes: data.gracePeriodMinutes ?? 15,
      weekendDays: data.weekendDays || ['Saturday', 'Sunday'],
      officeAddress: data.officeAddress,
      officeLatitude: data.officeLatitude,
      officeLongitude: data.officeLongitude,
      allowedAttendanceRadius: data.allowedAttendanceRadius ?? 200,
      setupCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const adminId = `usr-${Date.now()}`;
    const newAdmin: InternalUserRecord = {
      id: adminId,
      companyId: newCompany.id,
      email: data.adminEmail.toLowerCase(),
      fullName: data.adminFullName,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      passwordHash,
    };

    inMemoryCompany = newCompany;
    inMemoryUsers.push(newAdmin);

    for (const lt of DEFAULT_LEAVE_TYPES) {
      inMemoryLeaveTypes.push({
        id: `lt-${Date.now()}-${lt.name.toLowerCase().replace(/\s+/g, '-')}`,
        companyId: newCompany.id,
        name: lt.name,
        annualQuota: lt.quota,
        isPaid: lt.isPaid,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }

    await auditService.log({
      companyId: newCompany.id,
      actorUserId: newAdmin.id,
      action: 'COMPANY_INITIALIZED',
      entityType: 'Company',
      entityId: newCompany.id,
      afterData: { companyName: newCompany.name, adminEmail: newAdmin.email },
    });

    const { passwordHash: _, ...adminSummary } = newAdmin;
    return { company: newCompany, admin: adminSummary };
  },

  // -------------------------------------------------------------
  // USERS & IDENTITY
  // -------------------------------------------------------------
  async findUserByEmail(email: string): Promise<{ user: UserSummary; passwordHash: string } | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const pool = getDbPool();

    if (pool) {
      try {
        const result = await pool.query(
          `SELECT 
            id, company_id AS "companyId", email, password_hash AS "passwordHash",
            full_name AS "fullName", role, is_active AS "isActive",
            must_change_password AS "mustChangePassword", created_at AS "createdAt"
           FROM users 
           WHERE email = $1`,
          [normalizedEmail]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          return {
            user: {
              id: row.id,
              companyId: row.companyId,
              email: row.email,
              fullName: row.fullName,
              role: row.role as UserRole,
              isActive: row.isActive,
              mustChangePassword: row.mustChangePassword,
              createdAt: row.createdAt.toISOString ? row.createdAt.toISOString() : row.createdAt,
            },
            passwordHash: row.passwordHash,
          };
        }
        return null;
      } catch (err: any) {
        logger.error('Failed to find user by email in PostgreSQL', { error: err.message });
      }
    }

    const found = inMemoryUsers.find((u) => u.email === normalizedEmail);
    if (!found) return null;
    const { passwordHash, ...userSummary } = found;
    return { user: userSummary, passwordHash };
  },

  async findUserById(id: string): Promise<UserSummary | null> {
    const pool = getDbPool();
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT 
            id, company_id AS "companyId", email, full_name AS "fullName",
            role, is_active AS "isActive", must_change_password AS "mustChangePassword",
            created_at AS "createdAt"
           FROM users 
           WHERE id = $1`,
          [id]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          return {
            id: row.id,
            companyId: row.companyId,
            email: row.email,
            fullName: row.fullName,
            role: row.role as UserRole,
            isActive: row.isActive,
            mustChangePassword: row.mustChangePassword,
            createdAt: row.createdAt.toISOString ? row.createdAt.toISOString() : row.createdAt,
          };
        }
        return null;
      } catch (err: any) {
        logger.error('Failed to find user by ID in PostgreSQL', { error: err.message });
      }
    }

    const found = inMemoryUsers.find((u) => u.id === id);
    if (!found) return null;
    const { passwordHash: _, ...userSummary } = found;
    return userSummary;
  },

  async getCompanyById(id: string): Promise<Company | null> {
    const pool = getDbPool();
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT 
            id, name, timezone, office_start_time AS "officeStartTime",
            grace_period_minutes AS "gracePeriodMinutes", weekend_days AS "weekendDays",
            office_address AS "officeAddress", office_latitude AS "officeLatitude",
            office_longitude AS "officeLongitude", allowed_attendance_radius AS "allowedAttendanceRadius",
            setup_completed AS "setupCompleted", created_at AS "createdAt", updated_at AS "updatedAt"
           FROM companies 
           WHERE id = $1`,
          [id]
        );
        if (result.rows.length > 0) {
          const c = result.rows[0];
          return {
            ...c,
            weekendDays: Array.isArray(c.weekendDays) ? c.weekendDays : JSON.parse(c.weekendDays || '[]'),
          };
        }
        return null;
      } catch (err: any) {
        logger.error('Failed to find company by ID in PostgreSQL', { error: err.message });
      }
    }

    if (inMemoryCompany && inMemoryCompany.id === id) {
      return inMemoryCompany;
    }
    return null;
  },

  async getUsersByCompany(companyId: string): Promise<UserSummary[]> {
    const pool = getDbPool();
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT 
            id, company_id AS "companyId", email, full_name AS "fullName",
            role, is_active AS "isActive", must_change_password AS "mustChangePassword",
            created_at AS "createdAt"
           FROM users 
           WHERE company_id = $1
           ORDER BY created_at ASC`,
          [companyId]
        );
        return result.rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString ? row.createdAt.toISOString() : row.createdAt,
        }));
      } catch (err: any) {
        logger.error('Failed to list company users from PostgreSQL', { error: err.message });
      }
    }

    return inMemoryUsers
      .filter((u) => u.companyId === companyId)
      .map(({ passwordHash: _, ...summary }) => summary);
  },

  async updateUserStatus(userId: string, isActive: boolean, actorId: string): Promise<UserSummary | null> {
    const pool = getDbPool();
    let updatedUser: UserSummary | null = null;
    let beforeState: any = null;

    if (pool) {
      try {
        const beforeResult = await pool.query('SELECT is_active FROM users WHERE id = $1', [userId]);
        if (beforeResult.rows.length === 0) return null;
        beforeState = beforeResult.rows[0];

        const result = await pool.query(
          `UPDATE users 
           SET is_active = $1, updated_at = NOW() 
           WHERE id = $2 
           RETURNING id, company_id AS "companyId", email, full_name AS "fullName", role, is_active AS "isActive", must_change_password AS "mustChangePassword", created_at AS "createdAt"`,
          [isActive, userId]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          updatedUser = {
            ...row,
            createdAt: row.createdAt.toISOString ? row.createdAt.toISOString() : row.createdAt,
          };
        }
      } catch (err: any) {
        logger.error('Failed to update user status in PostgreSQL', { error: err.message });
      }
    } else {
      const user = inMemoryUsers.find((u) => u.id === userId);
      if (user) {
        beforeState = { is_active: user.isActive };
        user.isActive = isActive;
        const { passwordHash: _, ...summary } = user;
        updatedUser = summary;
      }
    }

    if (updatedUser) {
      await auditService.log({
        companyId: updatedUser.companyId,
        actorUserId: actorId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: updatedUser.id,
        beforeData: beforeState,
        afterData: { isActive },
      });
    }

    return updatedUser;
  },

  async createUser(params: {
    companyId: string;
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
    actorId: string;
  }): Promise<UserSummary> {
    const passwordHash = await bcrypt.hash(params.password, 10);
    const pool = getDbPool();

    let createdUser: UserSummary;

    if (pool) {
      const result = await pool.query(
        `INSERT INTO users 
          (company_id, email, password_hash, full_name, role, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, $5, true, false)
         RETURNING id, company_id AS "companyId", email, full_name AS "fullName", role, is_active AS "isActive", must_change_password AS "mustChangePassword", created_at AS "createdAt"`,
        [params.companyId, params.email.toLowerCase().trim(), passwordHash, params.fullName, params.role]
      );
      createdUser = result.rows[0];
    } else {
      const newRecord: InternalUserRecord = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        companyId: params.companyId,
        email: params.email.toLowerCase().trim(),
        fullName: params.fullName,
        role: params.role,
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
        passwordHash,
      };
      inMemoryUsers.push(newRecord);
      const { passwordHash: _, ...summary } = newRecord;
      createdUser = summary;
    }

    await auditService.log({
      companyId: params.companyId,
      actorUserId: params.actorId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: createdUser.id,
      afterData: { email: createdUser.email, role: createdUser.role },
    });

    return createdUser;
  },

  // -------------------------------------------------------------
  // DEPARTMENTS
  // -------------------------------------------------------------
  async listDepartments(
    companyId: string,
    options: { search?: string; isActive?: boolean; page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResult<Department>> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const pool = getDbPool();

    if (pool) {
      let query = `
        SELECT 
          d.id, d.company_id AS "companyId", d.name, d.description, d.is_active AS "isActive",
          d.created_at AS "createdAt", d.updated_at AS "updatedAt",
          COUNT(e.id) FILTER (WHERE e.employment_status = 'ACTIVE')::int AS "employeeCount"
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.company_id = d.company_id
        WHERE d.company_id = $1
      `;
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (options.search) {
        query += ` AND d.name ILIKE $${paramIndex}`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }
      if (options.isActive !== undefined) {
        query += ` AND d.is_active = $${paramIndex}`;
        params.push(options.isActive);
        paramIndex++;
      }

      query += ` GROUP BY d.id ORDER BY d.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pageSize, offset);

      const countQuery = `
        SELECT COUNT(DISTINCT d.id)::int AS total
        FROM departments d
        WHERE d.company_id = $1
        ${options.search ? `AND d.name ILIKE $2` : ''}
        ${options.isActive !== undefined ? `AND d.is_active = ${options.search ? '$3' : '$2'}` : ''}
      `;
      const countParams = [companyId];
      if (options.search) countParams.push(`%${options.search}%`);
      if (options.isActive !== undefined) countParams.push(options.isActive as any);

      try {
        const [itemsRes, countRes] = await Promise.all([
          pool.query(query, params),
          pool.query(countQuery, countParams),
        ]);
        const total = countRes.rows[0]?.total || 0;
        return {
          items: itemsRes.rows,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        };
      } catch (err: any) {
        logger.error('Failed to list departments from DB', { error: err.message });
      }
    }

    // In-memory fallback
    let filtered = inMemoryDepartments.filter((d) => d.companyId === companyId);
    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(s));
    }
    if (options.isActive !== undefined) {
      filtered = filtered.filter((d) => d.isActive === options.isActive);
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    // Calculate actual active employee counts
    const withCounts = filtered.map((dept) => {
      const count = inMemoryEmployees.filter(
        (e) => e.companyId === companyId && e.departmentId === dept.id && e.employmentStatus === 'ACTIVE'
      ).length;
      return { ...dept, employeeCount: count };
    });

    const total = withCounts.length;
    const items = withCounts.slice(offset, offset + pageSize);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async createDepartment(
    companyId: string,
    actorId: string,
    data: { name: string; description?: string }
  ): Promise<Department> {
    const trimmedName = data.name.trim();
    const pool = getDbPool();

    // Check duplicate name
    if (pool) {
      const dup = await pool.query(
        'SELECT id FROM departments WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
        [companyId, trimmedName]
      );
      if (dup.rows.length > 0) {
        throw new Error(`A department named "${trimmedName}" already exists in this organization.`);
      }

      const res = await pool.query(
        `INSERT INTO departments (company_id, name, description, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id, company_id AS "companyId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [companyId, trimmedName, data.description?.trim() || null]
      );
      const dept = { ...res.rows[0], employeeCount: 0 };
      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'DEPARTMENT_CREATED',
        entityType: 'Department',
        entityId: dept.id,
        afterData: { name: dept.name, description: dept.description },
      });
      return dept;
    }

    const dup = inMemoryDepartments.find(
      (d) => d.companyId === companyId && d.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (dup) {
      throw new Error(`A department named "${trimmedName}" already exists in this organization.`);
    }

    const newDept: Department = {
      id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId,
      name: trimmedName,
      description: data.description?.trim() || '',
      isActive: true,
      employeeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryDepartments.push(newDept);

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
      entityId: newDept.id,
      afterData: { name: newDept.name, description: newDept.description },
    });

    return newDept;
  },

  async updateDepartment(
    companyId: string,
    deptId: string,
    actorId: string,
    data: { name: string; description?: string }
  ): Promise<Department> {
    const trimmedName = data.name.trim();
    const pool = getDbPool();

    if (pool) {
      const dup = await pool.query(
        'SELECT id FROM departments WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [companyId, trimmedName, deptId]
      );
      if (dup.rows.length > 0) {
        throw new Error(`A department named "${trimmedName}" already exists in this organization.`);
      }

      const beforeRes = await pool.query('SELECT name, description, is_active FROM departments WHERE id = $1 AND company_id = $2', [deptId, companyId]);
      if (beforeRes.rows.length === 0) throw new Error('Department not found');
      const before = beforeRes.rows[0];

      const res = await pool.query(
        `UPDATE departments 
         SET name = $1, description = $2, updated_at = NOW() 
         WHERE id = $3 AND company_id = $4 
         RETURNING id, company_id AS "companyId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [trimmedName, data.description?.trim() || null, deptId, companyId]
      );
      const dept = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'DEPARTMENT_UPDATED',
        entityType: 'Department',
        entityId: dept.id,
        beforeData: before,
        afterData: { name: dept.name, description: dept.description },
      });
      return dept;
    }

    const dup = inMemoryDepartments.find(
      (d) => d.companyId === companyId && d.name.toLowerCase() === trimmedName.toLowerCase() && d.id !== deptId
    );
    if (dup) {
      throw new Error(`A department named "${trimmedName}" already exists in this organization.`);
    }

    const dept = inMemoryDepartments.find((d) => d.companyId === companyId && d.id === deptId);
    if (!dept) throw new Error('Department not found');

    const before = { name: dept.name, description: dept.description };
    dept.name = trimmedName;
    dept.description = data.description?.trim() || '';
    dept.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'Department',
      entityId: dept.id,
      beforeData: before,
      afterData: { name: dept.name, description: dept.description },
    });

    return dept;
  },

  async deactivateDepartment(
    companyId: string,
    deptId: string,
    actorId: string,
    isActive: boolean
  ): Promise<Department> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `UPDATE departments 
         SET is_active = $1, updated_at = NOW() 
         WHERE id = $2 AND company_id = $3 
         RETURNING id, company_id AS "companyId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [isActive, deptId, companyId]
      );
      if (res.rows.length === 0) throw new Error('Department not found');
      const dept = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: isActive ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED',
        entityType: 'Department',
        entityId: dept.id,
        afterData: { isActive },
      });
      return dept;
    }

    const dept = inMemoryDepartments.find((d) => d.companyId === companyId && d.id === deptId);
    if (!dept) throw new Error('Department not found');

    dept.isActive = isActive;
    dept.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: isActive ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED',
      entityType: 'Department',
      entityId: dept.id,
      afterData: { isActive },
    });

    return dept;
  },

  async getDepartmentById(companyId: string, deptId: string): Promise<Department | null> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT id, company_id AS "companyId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM departments WHERE id = $1 AND company_id = $2`,
        [deptId, companyId]
      );
      return res.rows[0] || null;
    }
    return inMemoryDepartments.find((d) => d.companyId === companyId && d.id === deptId) || null;
  },

  // -------------------------------------------------------------
  // DESIGNATIONS
  // -------------------------------------------------------------
  async listDesignations(
    companyId: string,
    options: { departmentId?: string; search?: string; isActive?: boolean; page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResult<Designation>> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const pool = getDbPool();

    if (pool) {
      let query = `
        SELECT 
          des.id, des.company_id AS "companyId", des.department_id AS "departmentId",
          des.name, des.description, des.is_active AS "isActive",
          des.created_at AS "createdAt", des.updated_at AS "updatedAt",
          dept.name AS "departmentName"
        FROM designations des
        LEFT JOIN departments dept ON des.department_id = dept.id
        WHERE des.company_id = $1
      `;
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (options.departmentId) {
        query += ` AND des.department_id = $${paramIndex}`;
        params.push(options.departmentId);
        paramIndex++;
      }
      if (options.search) {
        query += ` AND des.name ILIKE $${paramIndex}`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }
      if (options.isActive !== undefined) {
        query += ` AND des.is_active = $${paramIndex}`;
        params.push(options.isActive);
        paramIndex++;
      }

      query += ` ORDER BY des.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pageSize, offset);

      const countQuery = `
        SELECT COUNT(des.id)::int AS total
        FROM designations des
        WHERE des.company_id = $1
        ${options.departmentId ? `AND des.department_id = '${options.departmentId}'` : ''}
        ${options.search ? `AND des.name ILIKE '%${options.search}%'` : ''}
        ${options.isActive !== undefined ? `AND des.is_active = ${options.isActive}` : ''}
      `;

      try {
        const [itemsRes, countRes] = await Promise.all([
          pool.query(query, params),
          pool.query(countQuery, [companyId]),
        ]);
        const total = countRes.rows[0]?.total || 0;
        return {
          items: itemsRes.rows,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        };
      } catch (err: any) {
        logger.error('Failed to list designations from DB', { error: err.message });
      }
    }

    // In-memory fallback
    let filtered = inMemoryDesignations.filter((d) => d.companyId === companyId);
    if (options.departmentId) {
      filtered = filtered.filter((d) => d.departmentId === options.departmentId);
    }
    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(s));
    }
    if (options.isActive !== undefined) {
      filtered = filtered.filter((d) => d.isActive === options.isActive);
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const total = filtered.length;
    const items = filtered.slice(offset, offset + pageSize).map((des) => {
      const dept = inMemoryDepartments.find((dp) => dp.id === des.departmentId);
      return { ...des, departmentName: dept?.name || null };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async createDesignation(
    companyId: string,
    actorId: string,
    data: { name: string; departmentId?: string | null; description?: string }
  ): Promise<Designation> {
    const trimmedName = data.name.trim();
    const pool = getDbPool();

    // If departmentId provided, verify it exists and is active
    if (data.departmentId) {
      const dept = await this.getDepartmentById(companyId, data.departmentId);
      if (!dept) throw new Error('Associated department not found.');
      if (!dept.isActive) throw new Error(`Cannot assign designation to deactivated department "${dept.name}".`);
    }

    if (pool) {
      const dup = await pool.query(
        'SELECT id FROM designations WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
        [companyId, trimmedName]
      );
      if (dup.rows.length > 0) {
        throw new Error(`A designation named "${trimmedName}" already exists in this organization.`);
      }

      const res = await pool.query(
        `INSERT INTO designations (company_id, department_id, name, description, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, company_id AS "companyId", department_id AS "departmentId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [companyId, data.departmentId || null, trimmedName, data.description?.trim() || null]
      );
      const des = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'DESIGNATION_CREATED',
        entityType: 'Designation',
        entityId: des.id,
        afterData: { name: des.name, departmentId: des.departmentId },
      });
      return des;
    }

    const dup = inMemoryDesignations.find(
      (d) => d.companyId === companyId && d.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (dup) {
      throw new Error(`A designation named "${trimmedName}" already exists in this organization.`);
    }

    const newDes: Designation = {
      id: `desig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId,
      departmentId: data.departmentId || null,
      name: trimmedName,
      description: data.description?.trim() || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryDesignations.push(newDes);

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'DESIGNATION_CREATED',
      entityType: 'Designation',
      entityId: newDes.id,
      afterData: { name: newDes.name, departmentId: newDes.departmentId },
    });

    return newDes;
  },

  async updateDesignation(
    companyId: string,
    desigId: string,
    actorId: string,
    data: { name: string; departmentId?: string | null; description?: string }
  ): Promise<Designation> {
    const trimmedName = data.name.trim();
    const pool = getDbPool();

    if (data.departmentId) {
      const dept = await this.getDepartmentById(companyId, data.departmentId);
      if (!dept) throw new Error('Associated department not found.');
    }

    if (pool) {
      const dup = await pool.query(
        'SELECT id FROM designations WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [companyId, trimmedName, desigId]
      );
      if (dup.rows.length > 0) {
        throw new Error(`A designation named "${trimmedName}" already exists in this organization.`);
      }

      const beforeRes = await pool.query('SELECT name, department_id, description FROM designations WHERE id = $1 AND company_id = $2', [desigId, companyId]);
      if (beforeRes.rows.length === 0) throw new Error('Designation not found');
      const before = beforeRes.rows[0];

      const res = await pool.query(
        `UPDATE designations 
         SET name = $1, department_id = $2, description = $3, updated_at = NOW() 
         WHERE id = $4 AND company_id = $5 
         RETURNING id, company_id AS "companyId", department_id AS "departmentId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [trimmedName, data.departmentId || null, data.description?.trim() || null, desigId, companyId]
      );
      const des = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'DESIGNATION_UPDATED',
        entityType: 'Designation',
        entityId: des.id,
        beforeData: before,
        afterData: { name: des.name, departmentId: des.departmentId },
      });
      return des;
    }

    const dup = inMemoryDesignations.find(
      (d) => d.companyId === companyId && d.name.toLowerCase() === trimmedName.toLowerCase() && d.id !== desigId
    );
    if (dup) {
      throw new Error(`A designation named "${trimmedName}" already exists in this organization.`);
    }

    const des = inMemoryDesignations.find((d) => d.companyId === companyId && d.id === desigId);
    if (!des) throw new Error('Designation not found');

    const before = { name: des.name, departmentId: des.departmentId, description: des.description };
    des.name = trimmedName;
    des.departmentId = data.departmentId || null;
    des.description = data.description?.trim() || '';
    des.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'DESIGNATION_UPDATED',
      entityType: 'Designation',
      entityId: des.id,
      beforeData: before,
      afterData: { name: des.name, departmentId: des.departmentId },
    });

    return des;
  },

  async deactivateDesignation(
    companyId: string,
    desigId: string,
    actorId: string,
    isActive: boolean
  ): Promise<Designation> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `UPDATE designations 
         SET is_active = $1, updated_at = NOW() 
         WHERE id = $2 AND company_id = $3 
         RETURNING id, company_id AS "companyId", department_id AS "departmentId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [isActive, desigId, companyId]
      );
      if (res.rows.length === 0) throw new Error('Designation not found');
      const des = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: isActive ? 'DESIGNATION_ACTIVATED' : 'DESIGNATION_DEACTIVATED',
        entityType: 'Designation',
        entityId: des.id,
        afterData: { isActive },
      });
      return des;
    }

    const des = inMemoryDesignations.find((d) => d.companyId === companyId && d.id === desigId);
    if (!des) throw new Error('Designation not found');

    des.isActive = isActive;
    des.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: isActive ? 'DESIGNATION_ACTIVATED' : 'DESIGNATION_DEACTIVATED',
      entityType: 'Designation',
      entityId: des.id,
      afterData: { isActive },
    });

    return des;
  },

  async getDesignationById(companyId: string, desigId: string): Promise<Designation | null> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT id, company_id AS "companyId", department_id AS "departmentId", name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM designations WHERE id = $1 AND company_id = $2`,
        [desigId, companyId]
      );
      return res.rows[0] || null;
    }
    return inMemoryDesignations.find((d) => d.companyId === companyId && d.id === desigId) || null;
  },

  // -------------------------------------------------------------
  // LEAVE TYPES
  // -------------------------------------------------------------
  async getLeaveTypes(companyId: string): Promise<LeaveType[]> {
    const pool = getDbPool();
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT 
            id, company_id AS "companyId", name, annual_quota AS "annualQuota",
            is_paid AS "isPaid", is_active AS "isActive", created_at AS "createdAt"
           FROM leave_types 
           WHERE company_id = $1 
           ORDER BY created_at ASC`,
          [companyId]
        );
        return result.rows;
      } catch (err: any) {
        logger.error('Failed to get leave types from PostgreSQL', { error: err.message });
      }
    }

    return inMemoryLeaveTypes.filter((lt) => lt.companyId === companyId);
  },

  async updateLeaveType(
    companyId: string,
    leaveTypeId: string,
    actorId: string,
    data: { annualQuota: number; isPaid: boolean; isActive: boolean }
  ): Promise<LeaveType> {
    const pool = getDbPool();
    if (pool) {
      const beforeRes = await pool.query('SELECT name, annual_quota, is_paid, is_active FROM leave_types WHERE id = $1 AND company_id = $2', [leaveTypeId, companyId]);
      if (beforeRes.rows.length === 0) throw new Error('Leave type not found');
      const before = beforeRes.rows[0];

      const res = await pool.query(
        `UPDATE leave_types 
         SET annual_quota = $1, is_paid = $2, is_active = $3, updated_at = NOW() 
         WHERE id = $4 AND company_id = $5 
         RETURNING id, company_id AS "companyId", name, annual_quota AS "annualQuota", is_paid AS "isPaid", is_active AS "isActive", created_at AS "createdAt"`,
        [data.annualQuota, data.isPaid, data.isActive, leaveTypeId, companyId]
      );
      const lt = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'LEAVE_TYPE_UPDATED',
        entityType: 'LeaveType',
        entityId: lt.id,
        beforeData: before,
        afterData: data,
      });
      return lt;
    }

    const lt = inMemoryLeaveTypes.find((l) => l.companyId === companyId && l.id === leaveTypeId);
    if (!lt) throw new Error('Leave type not found');

    const before = { annualQuota: lt.annualQuota, isPaid: lt.isPaid, isActive: lt.isActive };
    lt.annualQuota = data.annualQuota;
    lt.isPaid = data.isPaid;
    lt.isActive = data.isActive;

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'LEAVE_TYPE_UPDATED',
      entityType: 'LeaveType',
      entityId: lt.id,
      beforeData: before,
      afterData: data,
    });

    return lt;
  },

  // -------------------------------------------------------------
  // PUBLIC HOLIDAYS
  // -------------------------------------------------------------
  async listHolidays(
    companyId: string,
    options: { year?: number; search?: string; page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResult<Holiday>> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const pool = getDbPool();

    if (pool) {
      let query = `
        SELECT id, company_id AS "companyId", name, holiday_date::text AS "holidayDate", description, created_at AS "createdAt"
        FROM holidays 
        WHERE company_id = $1
      `;
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (options.year) {
        query += ` AND EXTRACT(YEAR FROM holiday_date) = $${paramIndex}`;
        params.push(options.year);
        paramIndex++;
      }
      if (options.search) {
        query += ` AND name ILIKE $${paramIndex}`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY holiday_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pageSize, offset);

      const countQuery = `
        SELECT COUNT(id)::int AS total FROM holidays WHERE company_id = $1
        ${options.year ? `AND EXTRACT(YEAR FROM holiday_date) = ${options.year}` : ''}
        ${options.search ? `AND name ILIKE '%${options.search}%'` : ''}
      `;

      try {
        const [itemsRes, countRes] = await Promise.all([
          pool.query(query, params),
          pool.query(countQuery, [companyId]),
        ]);
        const total = countRes.rows[0]?.total || 0;
        return {
          items: itemsRes.rows,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        };
      } catch (err: any) {
        logger.error('Failed to list holidays from DB', { error: err.message });
      }
    }

    let filtered = inMemoryHolidays.filter((h) => h.companyId === companyId);
    if (options.year) {
      filtered = filtered.filter((h) => new Date(h.holidayDate).getFullYear() === options.year);
    }
    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter((h) => h.name.toLowerCase().includes(s));
    }
    filtered.sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));

    const total = filtered.length;
    const items = filtered.slice(offset, offset + pageSize);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async createHoliday(
    companyId: string,
    actorId: string,
    data: { name: string; holidayDate: string; description?: string }
  ): Promise<Holiday> {
    const trimmedName = data.name.trim();
    const pool = getDbPool();

    if (pool) {
      const dup = await pool.query(
        'SELECT id FROM holidays WHERE company_id = $1 AND holiday_date = $2',
        [companyId, data.holidayDate]
      );
      if (dup.rows.length > 0) {
        throw new Error(`A public holiday is already registered for date ${data.holidayDate}.`);
      }

      const res = await pool.query(
        `INSERT INTO holidays (company_id, name, holiday_date, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id, company_id AS "companyId", name, holiday_date::text AS "holidayDate", description, created_at AS "createdAt"`,
        [companyId, trimmedName, data.holidayDate, data.description?.trim() || null]
      );
      const hol = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'HOLIDAY_CREATED',
        entityType: 'Holiday',
        entityId: hol.id,
        afterData: { name: hol.name, date: hol.holidayDate },
      });
      return hol;
    }

    const dup = inMemoryHolidays.find(
      (h) => h.companyId === companyId && h.holidayDate === data.holidayDate
    );
    if (dup) {
      throw new Error(`A public holiday is already registered for date ${data.holidayDate}.`);
    }

    const newHol: Holiday = {
      id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId,
      name: trimmedName,
      holidayDate: data.holidayDate,
      description: data.description?.trim() || '',
      createdAt: new Date().toISOString(),
    };
    inMemoryHolidays.push(newHol);

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'HOLIDAY_CREATED',
      entityType: 'Holiday',
      entityId: newHol.id,
      afterData: { name: newHol.name, date: newHol.holidayDate },
    });

    return newHol;
  },

  async updateHoliday(
    companyId: string,
    holidayId: string,
    actorId: string,
    data: { name: string; holidayDate: string; description?: string }
  ): Promise<Holiday> {
    const trimmedName = data.name.trim();
    const pool = getDbPool();

    if (pool) {
      const dup = await pool.query(
        'SELECT id FROM holidays WHERE company_id = $1 AND holiday_date = $2 AND id != $3',
        [companyId, data.holidayDate, holidayId]
      );
      if (dup.rows.length > 0) {
        throw new Error(`A public holiday is already registered for date ${data.holidayDate}.`);
      }

      const beforeRes = await pool.query('SELECT name, holiday_date::text, description FROM holidays WHERE id = $1 AND company_id = $2', [holidayId, companyId]);
      if (beforeRes.rows.length === 0) throw new Error('Holiday not found');
      const before = beforeRes.rows[0];

      const res = await pool.query(
        `UPDATE holidays 
         SET name = $1, holiday_date = $2, description = $3 
         WHERE id = $4 AND company_id = $5 
         RETURNING id, company_id AS "companyId", name, holiday_date::text AS "holidayDate", description, created_at AS "createdAt"`,
        [trimmedName, data.holidayDate, data.description?.trim() || null, holidayId, companyId]
      );
      const hol = res.rows[0];

      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'HOLIDAY_UPDATED',
        entityType: 'Holiday',
        entityId: hol.id,
        beforeData: before,
        afterData: { name: hol.name, date: hol.holidayDate },
      });
      return hol;
    }

    const dup = inMemoryHolidays.find(
      (h) => h.companyId === companyId && h.holidayDate === data.holidayDate && h.id !== holidayId
    );
    if (dup) {
      throw new Error(`A public holiday is already registered for date ${data.holidayDate}.`);
    }

    const hol = inMemoryHolidays.find((h) => h.companyId === companyId && h.id === holidayId);
    if (!hol) throw new Error('Holiday not found');

    const before = { name: hol.name, holidayDate: hol.holidayDate };
    hol.name = trimmedName;
    hol.holidayDate = data.holidayDate;
    hol.description = data.description?.trim() || '';

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'HOLIDAY_UPDATED',
      entityType: 'Holiday',
      entityId: hol.id,
      beforeData: before,
      afterData: { name: hol.name, date: hol.holidayDate },
    });

    return hol;
  },

  async deleteHoliday(companyId: string, holidayId: string, actorId: string): Promise<void> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query('DELETE FROM holidays WHERE id = $1 AND company_id = $2 RETURNING name, holiday_date::text', [holidayId, companyId]);
      if (res.rows.length === 0) throw new Error('Holiday not found');
      await auditService.log({
        companyId,
        actorUserId: actorId,
        action: 'HOLIDAY_DELETED',
        entityType: 'Holiday',
        entityId: holidayId,
        beforeData: res.rows[0],
      });
      return;
    }

    const idx = inMemoryHolidays.findIndex((h) => h.companyId === companyId && h.id === holidayId);
    if (idx === -1) throw new Error('Holiday not found');
    const [deleted] = inMemoryHolidays.splice(idx, 1);
    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'HOLIDAY_DELETED',
      entityType: 'Holiday',
      entityId: holidayId,
      beforeData: deleted,
    });
  },

  // -------------------------------------------------------------
  // EMPLOYEES & REGISTRATION
  // -------------------------------------------------------------
  async listEmployees(
    companyId: string,
    options: {
      search?: string;
      departmentId?: string;
      designationId?: string;
      employmentStatus?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      canViewSalary?: boolean;
    } = {}
  ): Promise<PaginatedResult<EmployeeProfile>> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
    const offset = (page - 1) * pageSize;
    const pool = getDbPool();

    if (pool) {
      let query = `
        SELECT 
          e.id, e.company_id AS "companyId", e.user_id AS "userId",
          e.employee_code AS "employeeCode", u.full_name AS "fullName",
          u.email, e.phone, e.address,
          e.department_id AS "departmentId", dept.name AS "departmentName",
          e.designation_id AS "designationId", desig.name AS "designationName",
          e.employment_status AS "employmentStatus", e.employment_type AS "employmentType",
          e.joining_date::text AS "joiningDate", e.reporting_manager_id AS "reportingManagerId",
          mng_u.full_name AS "reportingManagerName",
          e.basic_salary::numeric AS "basicSalary",
          u.is_active AS "isActive", u.must_change_password AS "mustChangePassword",
          e.created_at AS "createdAt", e.updated_at AS "updatedAt"
        FROM employees e
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        LEFT JOIN designations desig ON e.designation_id = desig.id
        LEFT JOIN employees mng ON e.reporting_manager_id = mng.id
        LEFT JOIN users mng_u ON mng.user_id = mng_u.id
        WHERE e.company_id = $1
      `;
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (options.departmentId) {
        query += ` AND e.department_id = $${paramIndex}`;
        params.push(options.departmentId);
        paramIndex++;
      }
      if (options.designationId) {
        query += ` AND e.designation_id = $${paramIndex}`;
        params.push(options.designationId);
        paramIndex++;
      }
      if (options.employmentStatus) {
        query += ` AND e.employment_status = $${paramIndex}`;
        params.push(options.employmentStatus);
        paramIndex++;
      }
      if (options.search) {
        query += ` AND (u.full_name ILIKE $${paramIndex} OR e.employee_code ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }

      const sortCol = options.sortBy === 'joiningDate' ? 'e.joining_date' : options.sortBy === 'employeeCode' ? 'e.employee_code' : 'u.full_name';
      const order = options.sortOrder === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortCol} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pageSize, offset);

      const countQuery = `
        SELECT COUNT(e.id)::int AS total
        FROM employees e
        INNER JOIN users u ON e.user_id = u.id
        WHERE e.company_id = $1
        ${options.departmentId ? `AND e.department_id = '${options.departmentId}'` : ''}
        ${options.designationId ? `AND e.designation_id = '${options.designationId}'` : ''}
        ${options.employmentStatus ? `AND e.employment_status = '${options.employmentStatus}'` : ''}
        ${options.search ? `AND (u.full_name ILIKE '%${options.search}%' OR e.employee_code ILIKE '%${options.search}%' OR u.email ILIKE '%${options.search}%')` : ''}
      `;

      try {
        const [itemsRes, countRes] = await Promise.all([
          pool.query(query, params),
          pool.query(countQuery, [companyId]),
        ]);
        const total = countRes.rows[0]?.total || 0;
        const items = itemsRes.rows.map((row) => {
          if (!options.canViewSalary) {
            delete row.basicSalary;
          } else {
            row.basicSalary = Number(row.basicSalary || 0);
          }
          return row;
        });
        return {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        };
      } catch (err: any) {
        logger.error('Failed to list employees from DB', { error: err.message });
      }
    }

    // In-memory fallback
    let filtered = inMemoryEmployees.filter((e) => e.companyId === companyId);
    if (options.departmentId) {
      filtered = filtered.filter((e) => e.departmentId === options.departmentId);
    }
    if (options.designationId) {
      filtered = filtered.filter((e) => e.designationId === options.designationId);
    }
    if (options.employmentStatus) {
      filtered = filtered.filter((e) => e.employmentStatus === options.employmentStatus);
    }
    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.fullName.toLowerCase().includes(s) ||
          e.employeeCode.toLowerCase().includes(s) ||
          e.email.toLowerCase().includes(s)
      );
    }

    filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const total = filtered.length;
    const items = filtered.slice(offset, offset + pageSize).map((emp) => {
      const copy = { ...emp };
      if (!options.canViewSalary) {
        delete copy.basicSalary;
      }
      return copy;
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async registerEmployee(
    companyId: string,
    actorId: string,
    data: EmployeeRegisterInput
  ): Promise<{ employee: EmployeeProfile; temporaryPassword?: string }> {
    const trimmedCode = data.employeeCode.trim();
    const normalizedEmail = data.email.trim().toLowerCase();

    // 1. Verify Department exists and is ACTIVE
    const dept = await this.getDepartmentById(companyId, data.departmentId);
    if (!dept) throw new Error('Selected department does not exist.');
    if (!dept.isActive) {
      throw new Error(`Cannot register an employee in inactive department "${dept.name}". Please activate it or choose an active department.`);
    }

    // 2. Verify Designation exists and is ACTIVE
    const desig = await this.getDesignationById(companyId, data.designationId);
    if (!desig) throw new Error('Selected designation does not exist.');
    if (!desig.isActive) {
      throw new Error(`Cannot register an employee with inactive designation "${desig.name}".`);
    }

    // 3. Verify Reporting Manager exists if provided
    if (data.reportingManagerId) {
      const manager = await this.getEmployeeById(companyId, data.reportingManagerId);
      if (!manager) throw new Error('Reporting manager not found in this company.');
    }

    // 4. Validate Basic Salary non-negative
    if (data.basicSalary < 0) {
      throw new Error('Basic salary must be non-negative.');
    }

    // Generate secure temporary password
    const temporaryPassword = `Emp#${crypto.randomBytes(4).toString('hex')}!9`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const pool = getDbPool();

    if (pool) {
      // Check code uniqueness
      const codeDup = await pool.query('SELECT id FROM employees WHERE company_id = $1 AND LOWER(employee_code) = LOWER($2)', [companyId, trimmedCode]);
      if (codeDup.rows.length > 0) {
        throw new Error(`Employee ID/Code "${trimmedCode}" is already in use in this company.`);
      }

      // Check email uniqueness
      const emailDup = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
      if (emailDup.rows.length > 0) {
        throw new Error(`Email address "${normalizedEmail}" is already registered.`);
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create User account with role EMPLOYEE and must_change_password = true
        const userRes = await client.query(
          `INSERT INTO users (company_id, email, password_hash, full_name, role, is_active, must_change_password)
           VALUES ($1, $2, $3, $4, 'EMPLOYEE', true, true)
           RETURNING id, company_id AS "companyId", email, full_name AS "fullName", role, is_active AS "isActive", must_change_password AS "mustChangePassword", created_at AS "createdAt"`,
          [companyId, normalizedEmail, passwordHash, data.fullName.trim()]
        );
        const user = userRes.rows[0];

        // Create Employee profile
        const empRes = await client.query(
          `INSERT INTO employees 
            (company_id, user_id, employee_code, phone, address, department_id, designation_id, employment_status, employment_type, joining_date, reporting_manager_id, basic_salary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9, $10, $11)
           RETURNING id, company_id AS "companyId", user_id AS "userId", employee_code AS "employeeCode", phone, address, department_id AS "departmentId", designation_id AS "designationId", employment_status AS "employmentStatus", employment_type AS "employmentType", joining_date::text AS "joiningDate", reporting_manager_id AS "reportingManagerId", basic_salary::numeric AS "basicSalary", created_at AS "createdAt", updated_at AS "updatedAt"`,
          [
            companyId,
            user.id,
            trimmedCode,
            data.phone || null,
            data.address || null,
            data.departmentId,
            data.designationId,
            data.employmentType,
            data.joiningDate,
            data.reportingManagerId || null,
            data.basicSalary,
          ]
        );
        const empRow = empRes.rows[0];

        await client.query('COMMIT');

        const employee: EmployeeProfile = {
          ...empRow,
          fullName: user.fullName,
          email: user.email,
          departmentName: dept.name,
          designationName: desig.name,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          basicSalary: Number(empRow.basicSalary),
        };

        await auditService.log({
          companyId,
          actorUserId: actorId,
          action: 'EMPLOYEE_REGISTERED',
          entityType: 'Employee',
          entityId: employee.id,
          afterData: {
            employeeCode: employee.employeeCode,
            email: employee.email,
            department: dept.name,
            designation: desig.name,
          },
        });

        return { employee, temporaryPassword };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory fallback
    const codeDup = inMemoryEmployees.find(
      (e) => e.companyId === companyId && e.employeeCode.toLowerCase() === trimmedCode.toLowerCase()
    );
    if (codeDup) {
      throw new Error(`Employee ID/Code "${trimmedCode}" is already in use in this company.`);
    }

    const emailDup = inMemoryUsers.find((u) => u.email === normalizedEmail);
    if (emailDup) {
      throw new Error(`Email address "${normalizedEmail}" is already registered.`);
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const empId = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newUser: InternalUserRecord = {
      id: userId,
      companyId,
      email: normalizedEmail,
      fullName: data.fullName.trim(),
      role: 'EMPLOYEE',
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    inMemoryUsers.push(newUser);

    const newEmp: EmployeeProfile = {
      id: empId,
      companyId,
      userId,
      employeeCode: trimmedCode,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: data.phone || '',
      address: data.address || '',
      departmentId: data.departmentId,
      departmentName: dept.name,
      designationId: data.designationId,
      designationName: desig.name,
      employmentStatus: 'ACTIVE',
      employmentType: data.employmentType,
      joiningDate: data.joiningDate,
      reportingManagerId: data.reportingManagerId || null,
      basicSalary: data.basicSalary,
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryEmployees.push(newEmp);

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'EMPLOYEE_REGISTERED',
      entityType: 'Employee',
      entityId: newEmp.id,
      afterData: {
        employeeCode: newEmp.employeeCode,
        email: newEmp.email,
        department: dept.name,
        designation: desig.name,
      },
    });

    return { employee: newEmp, temporaryPassword };
  },

  async getEmployeeById(companyId: string, empId: string): Promise<EmployeeProfile | null> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT 
          e.id, e.company_id AS "companyId", e.user_id AS "userId",
          e.employee_code AS "employeeCode", u.full_name AS "fullName",
          u.email, e.phone, e.address,
          e.department_id AS "departmentId", dept.name AS "departmentName",
          e.designation_id AS "designationId", desig.name AS "designationName",
          e.employment_status AS "employmentStatus", e.employment_type AS "employmentType",
          e.joining_date::text AS "joiningDate", e.reporting_manager_id AS "reportingManagerId",
          mng_u.full_name AS "reportingManagerName",
          e.basic_salary::numeric AS "basicSalary",
          u.is_active AS "isActive", u.must_change_password AS "mustChangePassword",
          e.created_at AS "createdAt", e.updated_at AS "updatedAt"
        FROM employees e
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        LEFT JOIN designations desig ON e.designation_id = desig.id
        LEFT JOIN employees mng ON e.reporting_manager_id = mng.id
        LEFT JOIN users mng_u ON mng.user_id = mng_u.id
        WHERE e.id = $1 AND e.company_id = $2`,
        [empId, companyId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      row.basicSalary = Number(row.basicSalary || 0);
      return row;
    }

    const emp = inMemoryEmployees.find((e) => e.companyId === companyId && e.id === empId);
    if (!emp) return null;
    const mng = inMemoryEmployees.find((e) => e.id === emp.reportingManagerId);
    return {
      ...emp,
      reportingManagerName: mng?.fullName || null,
    };
  },

  async getEmployeeByUserId(companyId: string, userId: string): Promise<EmployeeProfile | null> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT 
          e.id, e.company_id AS "companyId", e.user_id AS "userId",
          e.employee_code AS "employeeCode", u.full_name AS "fullName",
          u.email, e.phone, e.address,
          e.department_id AS "departmentId", dept.name AS "departmentName",
          e.designation_id AS "designationId", desig.name AS "designationName",
          e.employment_status AS "employmentStatus", e.employment_type AS "employmentType",
          e.joining_date::text AS "joiningDate", e.reporting_manager_id AS "reportingManagerId",
          mng_u.full_name AS "reportingManagerName",
          e.basic_salary::numeric AS "basicSalary",
          u.is_active AS "isActive", u.must_change_password AS "mustChangePassword",
          e.created_at AS "createdAt", e.updated_at AS "updatedAt"
        FROM employees e
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        LEFT JOIN designations desig ON e.designation_id = desig.id
        LEFT JOIN employees mng ON e.reporting_manager_id = mng.id
        LEFT JOIN users mng_u ON mng.user_id = mng_u.id
        WHERE e.user_id = $1 AND e.company_id = $2`,
        [userId, companyId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      row.basicSalary = Number(row.basicSalary || 0);
      return row;
    }

    const emp = inMemoryEmployees.find((e) => e.companyId === companyId && e.userId === userId);
    return emp || null;
  },

  async updateEmployee(
    companyId: string,
    empId: string,
    actorId: string,
    data: EmployeeUpdateInput
  ): Promise<EmployeeProfile> {
    const existing = await this.getEmployeeById(companyId, empId);
    if (!existing) throw new Error('Employee not found.');

    if (data.departmentId && data.departmentId !== existing.departmentId) {
      const dept = await this.getDepartmentById(companyId, data.departmentId);
      if (!dept) throw new Error('Department not found.');
      if (!dept.isActive) throw new Error(`Department "${dept.name}" is deactivated.`);
    }

    if (data.designationId && data.designationId !== existing.designationId) {
      const des = await this.getDesignationById(companyId, data.designationId);
      if (!des) throw new Error('Designation not found.');
    }

    const pool = getDbPool();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
          [data.fullName.trim(), existing.userId, companyId]
        );

        await client.query(
          `UPDATE employees 
           SET phone = $1, address = $2, department_id = $3, designation_id = $4,
               employment_type = $5, joining_date = $6, reporting_manager_id = $7,
               basic_salary = COALESCE($8, basic_salary), updated_at = NOW()
           WHERE id = $9 AND company_id = $10`,
          [
            data.phone || null,
            data.address || null,
            data.departmentId,
            data.designationId,
            data.employmentType,
            data.joiningDate,
            data.reportingManagerId || null,
            data.basicSalary !== undefined ? data.basicSalary : null,
            empId,
            companyId,
          ]
        );

        await client.query('COMMIT');

        const updated = (await this.getEmployeeById(companyId, empId))!;
        await auditService.log({
          companyId,
          actorUserId: actorId,
          action: 'EMPLOYEE_UPDATED',
          entityType: 'Employee',
          entityId: empId,
          beforeData: { fullName: existing.fullName, departmentId: existing.departmentId },
          afterData: { fullName: updated.fullName, departmentId: updated.departmentId },
        });

        return updated;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory fallback
    const user = inMemoryUsers.find((u) => u.id === existing.userId);
    if (user) {
      user.fullName = data.fullName.trim();
    }

    const emp = inMemoryEmployees.find((e) => e.id === empId);
    if (emp) {
      emp.fullName = data.fullName.trim();
      emp.phone = data.phone || '';
      emp.address = data.address || '';
      emp.departmentId = data.departmentId;
      emp.designationId = data.designationId;
      emp.employmentType = data.employmentType;
      emp.joiningDate = data.joiningDate;
      emp.reportingManagerId = data.reportingManagerId || null;
      if (data.basicSalary !== undefined) {
        emp.basicSalary = data.basicSalary;
      }
      emp.updatedAt = new Date().toISOString();
    }

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId: empId,
      beforeData: { fullName: existing.fullName },
      afterData: { fullName: data.fullName },
    });

    return (await this.getEmployeeById(companyId, empId))!;
  },

  async updateEmployeeStatus(
    companyId: string,
    empId: string,
    actorId: string,
    data: EmployeeStatusUpdateInput
  ): Promise<EmployeeProfile> {
    const existing = await this.getEmployeeById(companyId, empId);
    if (!existing) throw new Error('Employee not found.');

    // Prevent deactivating own account
    if (existing.userId === actorId && !data.isActive) {
      throw new Error('You cannot deactivate your own administrative account.');
    }

    const pool = getDbPool();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE employees 
           SET employment_status = $1, updated_at = NOW() 
           WHERE id = $2 AND company_id = $3`,
          [data.employmentStatus, empId, companyId]
        );

        await client.query(
          `UPDATE users 
           SET is_active = $1, updated_at = NOW() 
           WHERE id = $2 AND company_id = $3`,
          [data.isActive, existing.userId, companyId]
        );

        await client.query('COMMIT');

        const updated = (await this.getEmployeeById(companyId, empId))!;
        await auditService.log({
          companyId,
          actorUserId: actorId,
          action: data.isActive ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
          entityType: 'Employee',
          entityId: empId,
          beforeData: { status: existing.employmentStatus, isActive: existing.isActive },
          afterData: { status: data.employmentStatus, isActive: data.isActive },
        });

        return updated;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const emp = inMemoryEmployees.find((e) => e.id === empId);
    const user = inMemoryUsers.find((u) => u.id === existing.userId);

    if (emp) {
      emp.employmentStatus = data.employmentStatus;
      emp.isActive = data.isActive;
      emp.updatedAt = new Date().toISOString();
    }
    if (user) {
      user.isActive = data.isActive;
    }

    await auditService.log({
      companyId,
      actorUserId: actorId,
      action: data.isActive ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      entityType: 'Employee',
      entityId: empId,
      afterData: { status: data.employmentStatus, isActive: data.isActive },
    });

    return (await this.getEmployeeById(companyId, empId))!;
  },

  // -------------------------------------------------------------
  // ATTENDANCE MANAGEMENT (PHASE 4)
  // -------------------------------------------------------------
  async getAttendanceById(companyId: string, attendanceId: string): Promise<AttendanceRecord | null> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT 
          a.id, a.company_id AS "companyId", a.employee_id AS "employeeId",
          e.employee_code AS "employeeCode", u.full_name AS "employeeName",
          dept.name AS "departmentName",
          a.attendance_date::text AS "attendanceDate",
          a.check_in AS "checkIn", a.check_out AS "checkOut",
          a.status, a.is_late AS "isLate", a.minutes_late AS "minutesLate",
          a.worked_minutes AS "workedMinutes", a.notes,
          a.is_corrected AS "isCorrected", a.correction_reason AS "correctionReason",
          a.corrected_by_user_id AS "correctedByUserId",
          a.created_at AS "createdAt", a.updated_at AS "updatedAt"
        FROM attendances a
        INNER JOIN employees e ON a.employee_id = e.id
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        WHERE a.id = $1 AND a.company_id = $2`,
        [attendanceId, companyId]
      );
      return res.rows[0] || null;
    }

    const rec = inMemoryAttendances.find((a) => a.id === attendanceId && a.companyId === companyId);
    return rec ? { ...rec } : null;
  },

  async getAttendanceToday(
    companyId: string,
    employeeId: string,
    dateStr: string
  ): Promise<AttendanceRecord | null> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT 
          a.id, a.company_id AS "companyId", a.employee_id AS "employeeId",
          e.employee_code AS "employeeCode", u.full_name AS "employeeName",
          dept.name AS "departmentName",
          a.attendance_date::text AS "attendanceDate",
          a.check_in AS "checkIn", a.check_out AS "checkOut",
          a.status, a.is_late AS "isLate", a.minutes_late AS "minutesLate",
          a.worked_minutes AS "workedMinutes", a.notes,
          a.is_corrected AS "isCorrected", a.correction_reason AS "correctionReason",
          a.corrected_by_user_id AS "correctedByUserId",
          a.created_at AS "createdAt", a.updated_at AS "updatedAt"
        FROM attendances a
        INNER JOIN employees e ON a.employee_id = e.id
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        WHERE a.company_id = $1 AND a.employee_id = $2 AND a.attendance_date = $3`,
        [companyId, employeeId, dateStr]
      );
      return res.rows[0] || null;
    }

    const rec = inMemoryAttendances.find(
      (a) => a.companyId === companyId && a.employeeId === employeeId && a.attendanceDate === dateStr
    );
    return rec ? { ...rec } : null;
  },

  async checkInAttendance(
    companyId: string,
    employeeId: string,
    actorUserId: string,
    checkInDate: Date = new Date(),
    notes?: string
  ): Promise<AttendanceRecord> {
    const company = await this.getCompanyById(companyId);
    if (!company) throw new Error('Company not found.');

    const dateStr = getCompanyLocalDateString(checkInDate, company.timezone);

    // 1. Check existing record
    const existing = await this.getAttendanceToday(companyId, employeeId, dateStr);
    if (existing && existing.checkIn) {
      const error: any = new Error('Employee has already checked in for today.');
      error.statusCode = 409;
      error.code = 'ATTENDANCE_ALREADY_CHECKED_IN';
      throw error;
    }

    // 2. Evaluate arrival time against officeStartTime & gracePeriod
    const evalResult = evaluateCheckIn(checkInDate, company);

    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO attendances (
          company_id, employee_id, attendance_date, check_in,
          status, is_late, minutes_late, worked_minutes, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
        ON CONFLICT (company_id, employee_id, attendance_date)
        DO UPDATE SET
          check_in = EXCLUDED.check_in,
          status = EXCLUDED.status,
          is_late = EXCLUDED.is_late,
          minutes_late = EXCLUDED.minutes_late,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id`,
        [
          companyId,
          employeeId,
          dateStr,
          checkInDate.toISOString(),
          evalResult.status,
          evalResult.isLate,
          evalResult.minutesLate,
          notes || null,
        ]
      );

      const record = (await this.getAttendanceById(companyId, res.rows[0].id))!;

      await auditService.log({
        companyId,
        actorUserId,
        action: 'ATTENDANCE_CHECKED_IN',
        entityType: 'Attendance',
        entityId: record.id,
        afterData: {
          attendanceDate: dateStr,
          checkIn: checkInDate.toISOString(),
          status: evalResult.status,
          isLate: evalResult.isLate,
          minutesLate: evalResult.minutesLate,
        },
      });

      return record;
    }

    // In-memory branch
    const emp = inMemoryEmployees.find((e) => e.id === employeeId);
    if (!emp) throw new Error('Employee not found.');

    const recordId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: AttendanceRecord = {
      id: recordId,
      companyId,
      employeeId,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      departmentName: emp.departmentName || undefined,
      attendanceDate: dateStr,
      checkIn: checkInDate.toISOString(),
      checkOut: null,
      status: evalResult.status,
      isLate: evalResult.isLate,
      minutesLate: evalResult.minutesLate,
      workedMinutes: 0,
      notes: notes || undefined,
      isCorrected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryAttendances.push(newRecord);

    await auditService.log({
      companyId,
      actorUserId,
      action: 'ATTENDANCE_CHECKED_IN',
      entityType: 'Attendance',
      entityId: newRecord.id,
      afterData: {
        attendanceDate: dateStr,
        checkIn: checkInDate.toISOString(),
        status: evalResult.status,
        isLate: evalResult.isLate,
        minutesLate: evalResult.minutesLate,
      },
    });

    return { ...newRecord };
  },

  async checkOutAttendance(
    companyId: string,
    employeeId: string,
    actorUserId: string,
    checkOutDate: Date = new Date(),
    notes?: string
  ): Promise<AttendanceRecord> {
    const company = await this.getCompanyById(companyId);
    if (!company) throw new Error('Company not found.');

    const dateStr = getCompanyLocalDateString(checkOutDate, company.timezone);

    // 1. Check existing record
    const existing = await this.getAttendanceToday(companyId, employeeId, dateStr);
    if (!existing || !existing.checkIn) {
      const error: any = new Error('No active check-in record found for today. You must check in first.');
      error.statusCode = 400;
      error.code = 'ATTENDANCE_NOT_CHECKED_IN';
      throw error;
    }

    if (existing.checkOut) {
      const error: any = new Error('Employee has already checked out for today.');
      error.statusCode = 409;
      error.code = 'ATTENDANCE_ALREADY_CHECKED_OUT';
      throw error;
    }

    // 2. Evaluate duration and final status
    const evalResult = evaluateCheckOut(
      new Date(existing.checkIn),
      checkOutDate,
      existing.isLate,
      existing.minutesLate
    );

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `UPDATE attendances
         SET check_out = $1,
             status = $2,
             worked_minutes = $3,
             notes = COALESCE($4, notes),
             updated_at = NOW()
         WHERE id = $5 AND company_id = $6`,
        [
          checkOutDate.toISOString(),
          evalResult.status,
          evalResult.workedMinutes,
          notes || null,
          existing.id,
          companyId,
        ]
      );

      const record = (await this.getAttendanceById(companyId, existing.id))!;

      await auditService.log({
        companyId,
        actorUserId,
        action: 'ATTENDANCE_CHECKED_OUT',
        entityType: 'Attendance',
        entityId: record.id,
        afterData: {
          attendanceDate: dateStr,
          checkOut: checkOutDate.toISOString(),
          workedMinutes: evalResult.workedMinutes,
          status: evalResult.status,
        },
      });

      return record;
    }

    // In-memory branch
    const rec = inMemoryAttendances.find((a) => a.id === existing.id);
    if (!rec) throw new Error('Attendance record not found.');

    rec.checkOut = checkOutDate.toISOString();
    rec.status = evalResult.status;
    rec.workedMinutes = evalResult.workedMinutes;
    if (notes) rec.notes = notes;
    rec.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId,
      action: 'ATTENDANCE_CHECKED_OUT',
      entityType: 'Attendance',
      entityId: rec.id,
      afterData: {
        attendanceDate: dateStr,
        checkOut: checkOutDate.toISOString(),
        workedMinutes: evalResult.workedMinutes,
        status: evalResult.status,
      },
    });

    return { ...rec };
  },

  async getEmployeeAttendanceHistory(
    companyId: string,
    employeeId: string,
    options: { month?: number; year?: number; page?: number; pageSize?: number } = {}
  ): Promise<{ records: AttendanceRecord[]; total: number; summary: AttendanceMonthlyReport }> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.pageSize || 31));
    const now = new Date();
    const month = options.month || now.getUTCMonth() + 1;
    const year = options.year || now.getUTCFullYear();

    const pool = getDbPool();
    if (pool) {
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}%`;
      const res = await pool.query(
        `SELECT 
          a.id, a.company_id AS "companyId", a.employee_id AS "employeeId",
          e.employee_code AS "employeeCode", u.full_name AS "employeeName",
          dept.name AS "departmentName",
          a.attendance_date::text AS "attendanceDate",
          a.check_in AS "checkIn", a.check_out AS "checkOut",
          a.status, a.is_late AS "isLate", a.minutes_late AS "minutesLate",
          a.worked_minutes AS "workedMinutes", a.notes,
          a.is_corrected AS "isCorrected", a.correction_reason AS "correctionReason",
          a.corrected_by_user_id AS "correctedByUserId",
          a.created_at AS "createdAt", a.updated_at AS "updatedAt"
        FROM attendances a
        INNER JOIN employees e ON a.employee_id = e.id
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        WHERE a.company_id = $1 AND a.employee_id = $2 AND a.attendance_date::text LIKE $3
        ORDER BY a.attendance_date DESC`,
        [companyId, employeeId, monthPrefix]
      );

      const allRecords: AttendanceRecord[] = res.rows;
      const total = allRecords.length;
      const paginatedRecords = allRecords.slice((page - 1) * pageSize, page * pageSize);

      let presentDays = 0;
      let lateDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;

      for (const r of allRecords) {
        if (r.status === 'PRESENT') presentDays++;
        if (r.status === 'LATE' || r.isLate) lateDays++;
        if (r.status === 'HALF_DAY') halfDays++;
        if (r.status === 'ABSENT') absentDays++;
        if (r.status === 'ON_LEAVE') leaveDays++;
      }

      return {
        records: paginatedRecords,
        total,
        summary: {
          month,
          year,
          totalWorkingDays: allRecords.length,
          presentDays,
          lateDays,
          halfDays,
          absentDays,
          leaveDays,
          records: allRecords,
        },
      };
    }

    // In-memory branch
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const matched = inMemoryAttendances
      .filter(
        (a) =>
          a.companyId === companyId &&
          a.employeeId === employeeId &&
          a.attendanceDate.startsWith(monthPrefix)
      )
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));

    const total = matched.length;
    const paginatedRecords = matched.slice((page - 1) * pageSize, page * pageSize);

    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    for (const r of matched) {
      if (r.status === 'PRESENT') presentDays++;
      if (r.status === 'LATE' || r.isLate) lateDays++;
      if (r.status === 'HALF_DAY') halfDays++;
      if (r.status === 'ABSENT') absentDays++;
      if (r.status === 'ON_LEAVE') leaveDays++;
    }

    return {
      records: paginatedRecords,
      total,
      summary: {
        month,
        year,
        totalWorkingDays: matched.length,
        presentDays,
        lateDays,
        halfDays,
        absentDays,
        leaveDays,
        records: matched,
      },
    };
  },

  async getCompanyAttendanceList(
    companyId: string,
    options: {
      date?: string;
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      status?: AttendanceStatus;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<AttendanceRecord>> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const pool = getDbPool();
    if (pool) {
      let query = `
        SELECT 
          a.id, a.company_id AS "companyId", a.employee_id AS "employeeId",
          e.employee_code AS "employeeCode", u.full_name AS "employeeName",
          dept.name AS "departmentName",
          a.attendance_date::text AS "attendanceDate",
          a.check_in AS "checkIn", a.check_out AS "checkOut",
          a.status, a.is_late AS "isLate", a.minutes_late AS "minutesLate",
          a.worked_minutes AS "workedMinutes", a.notes,
          a.is_corrected AS "isCorrected", a.correction_reason AS "correctionReason",
          a.corrected_by_user_id AS "correctedByUserId",
          a.created_at AS "createdAt", a.updated_at AS "updatedAt"
        FROM attendances a
        INNER JOIN employees e ON a.employee_id = e.id
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        WHERE a.company_id = $1
      `;
      const params: any[] = [companyId];
      let pIdx = 2;

      if (options.date) {
        query += ` AND a.attendance_date = $${pIdx++}`;
        params.push(options.date);
      }
      if (options.startDate) {
        query += ` AND a.attendance_date >= $${pIdx++}`;
        params.push(options.startDate);
      }
      if (options.endDate) {
        query += ` AND a.attendance_date <= $${pIdx++}`;
        params.push(options.endDate);
      }
      if (options.departmentId) {
        query += ` AND e.department_id = $${pIdx++}`;
        params.push(options.departmentId);
      }
      if (options.status) {
        query += ` AND a.status = $${pIdx++}`;
        params.push(options.status);
      }
      if (options.search) {
        query += ` AND (u.full_name ILIKE $${pIdx} OR e.employee_code ILIKE $${pIdx})`;
        params.push(`%${options.search}%`);
        pIdx++;
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM (${query}) AS total_subquery`,
        params
      );
      const total = parseInt(countRes.rows[0].count, 10);

      query += ` ORDER BY a.attendance_date DESC, a.created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
      params.push(pageSize, offset);

      const res = await pool.query(query, params);

      return {
        items: res.rows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }

    // In-memory branch
    let filtered = inMemoryAttendances.filter((a) => a.companyId === companyId);

    if (options.date) {
      filtered = filtered.filter((a) => a.attendanceDate === options.date);
    }
    if (options.startDate) {
      filtered = filtered.filter((a) => a.attendanceDate >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter((a) => a.attendanceDate <= options.endDate!);
    }
    if (options.departmentId) {
      const empIdsInDept = new Set(
        inMemoryEmployees.filter((e) => e.departmentId === options.departmentId).map((e) => e.id)
      );
      filtered = filtered.filter((a) => empIdsInDept.has(a.employeeId));
    }
    if (options.status) {
      filtered = filtered.filter((a) => a.status === options.status);
    }
    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.employeeName && a.employeeName.toLowerCase().includes(s)) ||
          (a.employeeCode && a.employeeCode.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));

    const total = filtered.length;
    const items = filtered.slice(offset, offset + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async getCompanyAttendanceSummary(companyId: string, dateStr: string): Promise<AttendanceSummary> {
    const totalEmployeesResult = await this.listEmployees(companyId, { pageSize: 1 });
    const totalEmployees = totalEmployeesResult.total;

    const listResult = await this.getCompanyAttendanceList(companyId, {
      date: dateStr,
      pageSize: 1000,
    });
    const records = listResult.items;

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let missingCheckoutsCount = 0;

    for (const r of records) {
      if (r.status === 'PRESENT') presentCount++;
      if (r.status === 'LATE' || r.isLate) lateCount++;
      if (r.status === 'HALF_DAY') halfDayCount++;
      if (r.status === 'ABSENT') absentCount++;
      if (r.status === 'ON_LEAVE') onLeaveCount++;
      if (r.checkIn && !r.checkOut) missingCheckoutsCount++;
    }

    // Any employee without an attendance record on this day is unaccounted/absent
    const recordedEmployeeIds = new Set(records.map((r) => r.employeeId));
    const unaccounted = Math.max(0, totalEmployees - recordedEmployeeIds.size);
    absentCount += unaccounted;

    return {
      totalEmployees,
      presentCount,
      lateCount,
      halfDayCount,
      absentCount,
      onLeaveCount,
      missingCheckoutsCount,
    };
  },

  async correctAttendance(
    companyId: string,
    attendanceId: string,
    actorUserId: string,
    input: AttendanceCorrectionInput
  ): Promise<AttendanceRecord> {
    const existing = await this.getAttendanceById(companyId, attendanceId);
    if (!existing) throw new Error('Attendance record not found.');

    const checkIn = input.checkIn !== undefined ? input.checkIn : existing.checkIn;
    const checkOut = input.checkOut !== undefined ? input.checkOut : existing.checkOut;
    let workedMinutes = existing.workedMinutes;

    if (checkIn && checkOut) {
      workedMinutes = Math.max(
        0,
        Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000)
      );
    }

    const finalStatus = input.status || existing.status;

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `UPDATE attendances
         SET status = $1,
             check_in = $2,
             check_out = $3,
             worked_minutes = $4,
             is_corrected = TRUE,
             correction_reason = $5,
             corrected_by_user_id = $6,
             updated_at = NOW()
         WHERE id = $7 AND company_id = $8`,
        [
          finalStatus,
          checkIn,
          checkOut,
          workedMinutes,
          input.correctionReason,
          actorUserId,
          attendanceId,
          companyId,
        ]
      );

      const updated = (await this.getAttendanceById(companyId, attendanceId))!;

      await auditService.log({
        companyId,
        actorUserId,
        action: 'ATTENDANCE_CORRECTED',
        entityType: 'Attendance',
        entityId: attendanceId,
        beforeData: {
          status: existing.status,
          checkIn: existing.checkIn,
          checkOut: existing.checkOut,
        },
        afterData: {
          status: updated.status,
          checkIn: updated.checkIn,
          checkOut: updated.checkOut,
          correctionReason: input.correctionReason,
        },
      });

      return updated;
    }

    // In-memory branch
    const rec = inMemoryAttendances.find((a) => a.id === attendanceId);
    if (!rec) throw new Error('Attendance record not found.');

    const beforeData = {
      status: rec.status,
      checkIn: rec.checkIn,
      checkOut: rec.checkOut,
    };

    rec.status = finalStatus;
    rec.checkIn = checkIn;
    rec.checkOut = checkOut;
    rec.workedMinutes = workedMinutes;
    rec.isCorrected = true;
    rec.correctionReason = input.correctionReason;
    rec.correctedByUserId = actorUserId;
    rec.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId,
      action: 'ATTENDANCE_CORRECTED',
      entityType: 'Attendance',
      entityId: attendanceId,
      beforeData,
      afterData: {
        status: rec.status,
        checkIn: rec.checkIn,
        checkOut: rec.checkOut,
        correctionReason: input.correctionReason,
      },
    });

    return { ...rec };
  },

  // -------------------------------------------------------------
  // LEAVE MANAGEMENT (PHASE 5)
  // -------------------------------------------------------------
  async estimateLeaveWorkingDays(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<WorkingDaysEstimateResponse> {
    const company = await this.getCompanyById(companyId);
    if (!company) throw new Error('Company not found.');
    const holidays = (await this.listHolidays(companyId, { pageSize: 500 })).items;
    return calculateWorkingDays(startDate, endDate, company.weekendDays, holidays);
  },

  async getLeaveRequestById(companyId: string, requestId: string): Promise<LeaveRequest | null> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT 
          lr.id, lr.company_id AS "companyId", lr.employee_id AS "employeeId",
          e.employee_code AS "employeeCode", u.full_name AS "employeeName",
          dept.name AS "departmentName",
          lr.leave_type_id AS "leaveTypeId", lt.name AS "leaveTypeName",
          lr.start_date::text AS "startDate", lr.end_date::text AS "endDate",
          lr.working_days::numeric AS "workingDays", lr.reason, lr.status,
          lr.reviewer_user_id AS "reviewerUserId", rev_u.full_name AS "reviewerName",
          lr.reviewed_at AS "reviewedAt", lr.reviewer_comments AS "reviewerComments",
          lr.created_at AS "createdAt", lr.updated_at AS "updatedAt"
        FROM leave_requests lr
        INNER JOIN employees e ON lr.employee_id = e.id
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        INNER JOIN leave_types lt ON lr.leave_type_id = lt.id
        LEFT JOIN users rev_u ON lr.reviewer_user_id = rev_u.id
        WHERE lr.id = $1 AND lr.company_id = $2`,
        [requestId, companyId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      row.workingDays = Number(row.workingDays);
      return row;
    }

    const rec = inMemoryLeaveRequests.find((r) => r.id === requestId && r.companyId === companyId);
    return rec ? { ...rec } : null;
  },

  async getLeaveBalances(
    companyId: string,
    employeeId: string,
    year: number = new Date().getUTCFullYear()
  ): Promise<LeaveBalanceSummary[]> {
    const leaveTypes = await this.getLeaveTypes(companyId);
    const activeTypes = leaveTypes.filter((lt) => lt.isActive);

    const yearPrefix = `${year}-%`;
    let approvedRequests: LeaveRequest[] = [];

    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT leave_type_id AS "leaveTypeId", SUM(working_days)::numeric AS "usedDays"
         FROM leave_requests
         WHERE company_id = $1 AND employee_id = $2 AND status = 'APPROVED'
           AND start_date::text LIKE $3
         GROUP BY leave_type_id`,
        [companyId, employeeId, yearPrefix]
      );

      const usedMap = new Map<string, number>();
      for (const row of res.rows) {
        usedMap.set(row.leaveTypeId, Number(row.usedDays));
      }

      return activeTypes.map((lt) => {
        const used = usedMap.get(lt.id) || 0;
        const remaining = lt.isPaid && lt.annualQuota > 0 ? Math.max(0, lt.annualQuota - used) : 999;
        return {
          leaveTypeId: lt.id,
          leaveTypeName: lt.name,
          annualQuota: Number(lt.annualQuota),
          isPaid: lt.isPaid,
          usedDays: used,
          remainingDays: lt.annualQuota > 0 ? remaining : 999,
        };
      });
    }

    // In-memory branch
    approvedRequests = inMemoryLeaveRequests.filter(
      (r) =>
        r.companyId === companyId &&
        r.employeeId === employeeId &&
        r.status === 'APPROVED' &&
        r.startDate.startsWith(String(year))
    );

    return activeTypes.map((lt) => {
      const used = approvedRequests
        .filter((r) => r.leaveTypeId === lt.id)
        .reduce((sum, r) => sum + r.workingDays, 0);
      const remaining = lt.isPaid && lt.annualQuota > 0 ? Math.max(0, lt.annualQuota - used) : 999;
      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        annualQuota: Number(lt.annualQuota),
        isPaid: lt.isPaid,
        usedDays: used,
        remainingDays: lt.annualQuota > 0 ? remaining : 999,
      };
    });
  },

  async submitLeaveRequest(
    companyId: string,
    employeeId: string,
    actorUserId: string,
    input: LeaveRequestSubmitInput
  ): Promise<LeaveRequest> {
    const company = await this.getCompanyById(companyId);
    if (!company) throw new Error('Company not found.');

    const emp = await this.getEmployeeById(companyId, employeeId);
    if (!emp) throw new Error('Employee profile not found.');

    const leaveType = (await this.getLeaveTypes(companyId)).find((lt) => lt.id === input.leaveTypeId);
    if (!leaveType) throw new Error('Selected leave type does not exist.');
    if (!leaveType.isActive) throw new Error(`Leave policy "${leaveType.name}" is deactivated.`);

    // 1. Calculate working days (skipping company weekends & public holidays)
    const holidays = (await this.listHolidays(companyId, { pageSize: 500 })).items;
    const estimate = calculateWorkingDays(input.startDate, input.endDate, company.weekendDays, holidays);

    if (estimate.workingDays <= 0) {
      throw new Error(
        'Selected date range contains 0 working days (all requested days are weekends or official holidays).'
      );
    }

    // 2. Prevent overlapping leave requests
    const existingRequests = await this.getMyLeaveRequests(companyId, employeeId);
    const activeRequests = existingRequests.filter(
      (r) => r.status === 'PENDING' || r.status === 'APPROVED'
    );

    for (const r of activeRequests) {
      if (hasLeaveOverlap(input.startDate, input.endDate, r.startDate, r.endDate)) {
        const error: any = new Error(
          `An overlapping leave request (${r.startDate} to ${r.endDate}, status: ${r.status}) already exists.`
        );
        error.code = 'LEAVE_OVERLAP_DETECTED';
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Balance verification
    if (leaveType.isPaid && leaveType.annualQuota > 0) {
      const year = parseInt(input.startDate.slice(0, 4), 10);
      const balances = await this.getLeaveBalances(companyId, employeeId, year);
      const bal = balances.find((b) => b.leaveTypeId === leaveType.id);

      if (bal && estimate.workingDays > bal.remainingDays) {
        const error: any = new Error(
          `Insufficient leave balance. You requested ${estimate.workingDays} working days, but remaining balance for ${leaveType.name} is ${bal.remainingDays} days.`
        );
        error.code = 'INSUFFICIENT_LEAVE_BALANCE';
        error.statusCode = 422;
        throw error;
      }
    }

    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO leave_requests (
          company_id, employee_id, leave_type_id, start_date, end_date,
          working_days, reason, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
        RETURNING id`,
        [
          companyId,
          employeeId,
          input.leaveTypeId,
          input.startDate,
          input.endDate,
          estimate.workingDays,
          input.reason.trim(),
        ]
      );

      const record = (await this.getLeaveRequestById(companyId, res.rows[0].id))!;

      await auditService.log({
        companyId,
        actorUserId,
        action: 'LEAVE_REQUEST_SUBMITTED',
        entityType: 'LeaveRequest',
        entityId: record.id,
        afterData: {
          employeeCode: emp.employeeCode,
          leaveType: leaveType.name,
          startDate: input.startDate,
          endDate: input.endDate,
          workingDays: estimate.workingDays,
        },
      });

      return record;
    }

    // In-memory branch
    const newReq: LeaveRequest = {
      id: `lr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId,
      employeeId,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      departmentName: emp.departmentName || undefined,
      leaveTypeId: leaveType.id,
      leaveTypeName: leaveType.name,
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays: estimate.workingDays,
      reason: input.reason.trim(),
      status: 'PENDING',
      reviewerUserId: null,
      reviewerName: null,
      reviewedAt: null,
      reviewerComments: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryLeaveRequests.push(newReq);

    await auditService.log({
      companyId,
      actorUserId,
      action: 'LEAVE_REQUEST_SUBMITTED',
      entityType: 'LeaveRequest',
      entityId: newReq.id,
      afterData: {
        employeeCode: emp.employeeCode,
        leaveType: leaveType.name,
        startDate: input.startDate,
        endDate: input.endDate,
        workingDays: estimate.workingDays,
      },
    });

    return { ...newReq };
  },

  async getMyLeaveRequests(companyId: string, employeeId: string): Promise<LeaveRequest[]> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT 
          lr.id, lr.company_id AS "companyId", lr.employee_id AS "employeeId",
          e.employee_code AS "employeeCode", u.full_name AS "employeeName",
          dept.name AS "departmentName",
          lr.leave_type_id AS "leaveTypeId", lt.name AS "leaveTypeName",
          lr.start_date::text AS "startDate", lr.end_date::text AS "endDate",
          lr.working_days::numeric AS "workingDays", lr.reason, lr.status,
          lr.reviewer_user_id AS "reviewerUserId", rev_u.full_name AS "reviewerName",
          lr.reviewed_at AS "reviewedAt", lr.reviewer_comments AS "reviewerComments",
          lr.created_at AS "createdAt", lr.updated_at AS "updatedAt"
        FROM leave_requests lr
        INNER JOIN employees e ON lr.employee_id = e.id
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        INNER JOIN leave_types lt ON lr.leave_type_id = lt.id
        LEFT JOIN users rev_u ON lr.reviewer_user_id = rev_u.id
        WHERE lr.company_id = $1 AND lr.employee_id = $2
        ORDER BY lr.created_at DESC`,
        [companyId, employeeId]
      );
      return res.rows.map((r: any) => ({ ...r, workingDays: Number(r.workingDays) }));
    }

    return inMemoryLeaveRequests
      .filter((r) => r.companyId === companyId && r.employeeId === employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r }));
  },

  async getCompanyLeaveRequests(
    companyId: string,
    filters: {
      status?: LeaveRequestStatus;
      departmentId?: string;
      leaveTypeId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<LeaveRequest>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const pool = getDbPool();
    if (pool) {
      let query = `
        SELECT 
          lr.id, lr.company_id AS "companyId", lr.employee_id AS "employeeId",
          e.employee_code AS "employeeCode", u.full_name AS "employeeName",
          dept.name AS "departmentName",
          lr.leave_type_id AS "leaveTypeId", lt.name AS "leaveTypeName",
          lr.start_date::text AS "startDate", lr.end_date::text AS "endDate",
          lr.working_days::numeric AS "workingDays", lr.reason, lr.status,
          lr.reviewer_user_id AS "reviewerUserId", rev_u.full_name AS "reviewerName",
          lr.reviewed_at AS "reviewedAt", lr.reviewer_comments AS "reviewerComments",
          lr.created_at AS "createdAt", lr.updated_at AS "updatedAt"
        FROM leave_requests lr
        INNER JOIN employees e ON lr.employee_id = e.id
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        INNER JOIN leave_types lt ON lr.leave_type_id = lt.id
        LEFT JOIN users rev_u ON lr.reviewer_user_id = rev_u.id
        WHERE lr.company_id = $1
      `;
      const params: any[] = [companyId];
      let pIdx = 2;

      if (filters.status) {
        query += ` AND lr.status = $${pIdx++}`;
        params.push(filters.status);
      }
      if (filters.departmentId) {
        query += ` AND e.department_id = $${pIdx++}`;
        params.push(filters.departmentId);
      }
      if (filters.leaveTypeId) {
        query += ` AND lr.leave_type_id = $${pIdx++}`;
        params.push(filters.leaveTypeId);
      }
      if (filters.search) {
        query += ` AND (u.full_name ILIKE $${pIdx} OR e.employee_code ILIKE $${pIdx})`;
        params.push(`%${filters.search}%`);
        pIdx++;
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM (${query}) AS total_subquery`,
        params
      );
      const total = parseInt(countRes.rows[0].count, 10);

      query += ` ORDER BY lr.created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
      params.push(pageSize, offset);

      const res = await pool.query(query, params);
      const items = res.rows.map((r: any) => ({ ...r, workingDays: Number(r.workingDays) }));

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }

    // In-memory branch
    let filtered = inMemoryLeaveRequests.filter((r) => r.companyId === companyId);
    if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
    if (filters.leaveTypeId) filtered = filtered.filter((r) => r.leaveTypeId === filters.leaveTypeId);
    if (filters.departmentId) {
      const empIds = new Set(
        inMemoryEmployees.filter((e) => e.departmentId === filters.departmentId).map((e) => e.id)
      );
      filtered = filtered.filter((r) => empIds.has(r.employeeId));
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.employeeName && r.employeeName.toLowerCase().includes(s)) ||
          (r.employeeCode && r.employeeCode.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = filtered.length;
    const items = filtered.slice(offset, offset + pageSize).map((r) => ({ ...r }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async reviewLeaveRequest(
    companyId: string,
    requestId: string,
    reviewerUserId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Promise<LeaveRequest> {
    const existing = await this.getLeaveRequestById(companyId, requestId);
    if (!existing) throw new Error('Leave request not found.');

    if (existing.status !== 'PENDING') {
      const error: any = new Error(
        `Leave request has already been processed with status "${existing.status}".`
      );
      error.statusCode = 409;
      error.code = 'LEAVE_ALREADY_REVIEWED';
      throw error;
    }

    const reviewer = await this.findUserById(reviewerUserId);

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `UPDATE leave_requests
         SET status = $1,
             reviewer_user_id = $2,
             reviewed_at = NOW(),
             reviewer_comments = $3,
             updated_at = NOW()
         WHERE id = $4 AND company_id = $5`,
        [decision, reviewerUserId, comments || null, requestId, companyId]
      );

      const updated = (await this.getLeaveRequestById(companyId, requestId))!;

      await auditService.log({
        companyId,
        actorUserId: reviewerUserId,
        action: decision === 'APPROVED' ? 'LEAVE_REQUEST_APPROVED' : 'LEAVE_REQUEST_REJECTED',
        entityType: 'LeaveRequest',
        entityId: requestId,
        beforeData: { status: existing.status },
        afterData: {
          status: updated.status,
          reviewer: reviewer?.fullName,
          comments,
        },
      });

      return updated;
    }

    // In-memory branch
    const req = inMemoryLeaveRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Leave request not found.');

    req.status = decision;
    req.reviewerUserId = reviewerUserId;
    req.reviewerName = reviewer?.fullName || null;
    req.reviewedAt = new Date().toISOString();
    req.reviewerComments = comments || null;
    req.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId: reviewerUserId,
      action: decision === 'APPROVED' ? 'LEAVE_REQUEST_APPROVED' : 'LEAVE_REQUEST_REJECTED',
      entityType: 'LeaveRequest',
      entityId: requestId,
      beforeData: { status: existing.status },
      afterData: {
        status: req.status,
        reviewer: reviewer?.fullName,
        comments,
      },
    });

    return { ...req };
  },

  async cancelLeaveRequest(
    companyId: string,
    requestId: string,
    employeeId: string,
    actorUserId: string
  ): Promise<LeaveRequest> {
    const existing = await this.getLeaveRequestById(companyId, requestId);
    if (!existing) throw new Error('Leave request not found.');

    if (existing.employeeId !== employeeId) {
      const error: any = new Error('You are not authorized to cancel this leave request.');
      error.statusCode = 403;
      throw error;
    }

    if (existing.status !== 'PENDING') {
      const error: any = new Error(`Only pending leave requests can be cancelled. Current status is ${existing.status}.`);
      error.statusCode = 400;
      throw error;
    }

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `UPDATE leave_requests
         SET status = 'CANCELLED',
             updated_at = NOW()
         WHERE id = $1 AND company_id = $2`,
        [requestId, companyId]
      );

      const updated = (await this.getLeaveRequestById(companyId, requestId))!;

      await auditService.log({
        companyId,
        actorUserId,
        action: 'LEAVE_REQUEST_CANCELLED',
        entityType: 'LeaveRequest',
        entityId: requestId,
        beforeData: { status: existing.status },
        afterData: { status: 'CANCELLED' },
      });

      return updated;
    }

    // In-memory branch
    const req = inMemoryLeaveRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Leave request not found.');

    req.status = 'CANCELLED';
    req.updatedAt = new Date().toISOString();

    await auditService.log({
      companyId,
      actorUserId,
      action: 'LEAVE_REQUEST_CANCELLED',
      entityType: 'LeaveRequest',
      entityId: requestId,
      beforeData: { status: existing.status },
      afterData: { status: 'CANCELLED' },
    });

    return { ...req };
  },

  // -------------------------------------------------------------
  // PHASE 6 PAYROLL SERVICES
  // -------------------------------------------------------------
  async generatePayrollDraft(
    companyId: string,
    month: number,
    year: number,
    actorUserId: string
  ): Promise<PayrollRunDetail> {
    const pool = getDbPool();

    // Check if finalized run already exists
    if (pool) {
      const existing = await pool.query(
        `SELECT * FROM payroll_runs WHERE company_id = $1 AND month = $2 AND year = $3`,
        [companyId, month, year]
      );
      if (existing.rows.length > 0 && existing.rows[0].status === 'FINALIZED') {
        const err: any = new Error('Payroll for this period has already been finalized and cannot be modified.');
        err.statusCode = 400;
        throw err;
      }
    } else {
      const existing = inMemoryPayrollRuns.find(
        (r) => r.companyId === companyId && r.month === month && r.year === year
      );
      if (existing && existing.status === 'FINALIZED') {
        const err: any = new Error('Payroll for this period has already been finalized and cannot be modified.');
        err.statusCode = 400;
        throw err;
      }
    }

    // Fetch active employees
    const employees = await this.listEmployees(companyId, { pageSize: 500, employmentStatus: 'ACTIVE', canViewSalary: true });
    const empList = employees.items;

    // Date prefix for matching attendance and leaves: YYYY-MM
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    // Get all attendances in this month
    let monthAttendances: AttendanceRecord[] = [];
    if (pool) {
      const attResult = await pool.query(
        `SELECT * FROM attendances WHERE company_id = $1 AND attendance_date >= $2 AND attendance_date <= $3`,
        [companyId, `${monthPrefix}-01`, `${monthPrefix}-31`]
      );
      monthAttendances = attResult.rows.map((r: any) => ({
        id: r.id,
        companyId: r.company_id,
        employeeId: r.employee_id,
        attendanceDate: r.attendance_date,
        checkIn: r.check_in,
        checkOut: r.check_out,
        status: r.status,
        isLate: r.is_late,
        minutesLate: r.minutes_late,
        workedMinutes: r.worked_minutes,
        notes: r.notes,
        isCorrected: r.is_corrected,
        correctionReason: r.correction_reason,
        correctedByUserId: r.corrected_by_user_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } else {
      monthAttendances = inMemoryAttendances.filter(
        (a) => a.companyId === companyId && a.attendanceDate.startsWith(monthPrefix)
      );
    }

    // Get unpaid leaves in this month
    let unpaidLeaves: LeaveRequest[] = [];
    if (pool) {
      const leavesResult = await pool.query(
        `SELECT lr.* FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE lr.company_id = $1 AND lr.status = 'APPROVED' AND lt.is_paid = false
           AND lr.start_date <= $2 AND lr.end_date >= $3`,
        [companyId, `${monthPrefix}-31`, `${monthPrefix}-01`]
      );
      unpaidLeaves = leavesResult.rows.map((r: any) => ({
        id: r.id,
        companyId: r.company_id,
        employeeId: r.employee_id,
        leaveTypeId: r.leave_type_id,
        startDate: r.start_date,
        endDate: r.end_date,
        workingDays: Number(r.working_days),
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } else {
      const unpaidTypeIds = inMemoryLeaveTypes.filter((lt) => lt.companyId === companyId && !lt.isPaid).map((lt) => lt.id);
      unpaidLeaves = inMemoryLeaveRequests.filter(
        (lr) =>
          lr.companyId === companyId &&
          lr.status === 'APPROVED' &&
          unpaidTypeIds.includes(lr.leaveTypeId) &&
          lr.startDate <= `${monthPrefix}-31` &&
          lr.endDate >= `${monthPrefix}-01`
      );
    }

    const items: PayrollItem[] = [];

    for (const emp of empList) {
      const basicSalary = Number(emp.basicSalary) > 0 ? Number(emp.basicSalary) : 50000;

      // Attendance records for this employee
      const empAtt = monthAttendances.filter((a) => a.employeeId === emp.id);
      let presentDays = 0;
      let absentDays = 0;

      for (const a of empAtt) {
        if (a.status === 'PRESENT' || a.status === 'LATE') {
          presentDays += 1;
        } else if (a.status === 'HALF_DAY') {
          presentDays += 0.5;
          absentDays += 0.5;
        } else if (a.status === 'ABSENT') {
          absentDays += 1;
        }
      }

      // If no explicit attendance records at all, assume normal full attendance
      if (empAtt.length === 0) {
        presentDays = 26;
        absentDays = 0;
      }

      // Unpaid leaves
      const empUnpaidLeaves = unpaidLeaves.filter((l) => l.employeeId === emp.id);
      const unpaidLeaveDays = empUnpaidLeaves.reduce((acc, curr) => acc + curr.workingDays, 0);

      const breakdown = computeEmployeeSalary(basicSalary, presentDays, absentDays, unpaidLeaveDays, 26);

      items.push({
        id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        payrollRunId: '',
        companyId,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        departmentName: emp.departmentName || undefined,
        designationName: emp.designationName || undefined,
        ...breakdown,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const totalGross = Math.round(items.reduce((s, i) => s + i.grossSalary, 0) * 100) / 100;
    const totalDeductions = Math.round(
      items.reduce((s, i) => s + (i.absentDeduction + i.unpaidLeaveDeduction + i.taxWithholding), 0) * 100
    ) / 100;
    const totalNet = Math.round(items.reduce((s, i) => s + i.netSalary, 0) * 100) / 100;

    let runRecord: PayrollRun;

    if (pool) {
      // Upsert payroll run
      const runRes = await pool.query(
        `INSERT INTO payroll_runs 
          (company_id, month, year, status, total_gross, total_deductions, total_net, employee_count, updated_at)
         VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6, $7, NOW())
         ON CONFLICT (company_id, month, year)
         DO UPDATE SET
           total_gross = EXCLUDED.total_gross,
           total_deductions = EXCLUDED.total_deductions,
           total_net = EXCLUDED.total_net,
           employee_count = EXCLUDED.employee_count,
           updated_at = NOW()
         RETURNING 
           id, company_id AS "companyId", month, year, status,
           total_gross AS "totalGross", total_deductions AS "totalDeductions",
           total_net AS "totalNet", employee_count AS "employeeCount",
           finalized_by AS "finalizedBy", finalized_at AS "finalizedAt",
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [companyId, month, year, totalGross, totalDeductions, totalNet, items.length]
      );
      runRecord = {
        ...runRes.rows[0],
        totalGross: Number(runRes.rows[0].totalGross),
        totalDeductions: Number(runRes.rows[0].totalDeductions),
        totalNet: Number(runRes.rows[0].totalNet),
      };

      // Delete existing draft items for this run
      await pool.query(`DELETE FROM payroll_items WHERE payroll_run_id = $1`, [runRecord.id]);

      // Insert new items
      for (const it of items) {
        it.payrollRunId = runRecord.id;
        const itRes = await pool.query(
          `INSERT INTO payroll_items
            (payroll_run_id, company_id, employee_id, basic_salary, hra, medical_allowance, gross_salary,
             working_days, present_days, absent_days, unpaid_leave_days, absent_deduction, unpaid_leave_deduction,
             tax_withholding, net_salary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING id, created_at AS "createdAt", updated_at AS "updatedAt"`,
          [
            runRecord.id,
            companyId,
            it.employeeId,
            it.basicSalary,
            it.hra,
            it.medicalAllowance,
            it.grossSalary,
            it.workingDays,
            it.presentDays,
            it.absentDays,
            it.unpaidLeaveDays,
            it.absentDeduction,
            it.unpaidLeaveDeduction,
            it.taxWithholding,
            it.netSalary,
          ]
        );
        it.id = itRes.rows[0].id;
        it.createdAt = itRes.rows[0].createdAt;
        it.updatedAt = itRes.rows[0].updatedAt;
      }
    } else {
      const existingIdx = inMemoryPayrollRuns.findIndex(
        (r) => r.companyId === companyId && r.month === month && r.year === year
      );

      const runId = existingIdx >= 0 ? inMemoryPayrollRuns[existingIdx].id : `pr-${Date.now()}`;
      runRecord = {
        id: runId,
        companyId,
        month,
        year,
        status: 'DRAFT',
        totalGross,
        totalDeductions,
        totalNet,
        employeeCount: items.length,
        createdAt: existingIdx >= 0 ? inMemoryPayrollRuns[existingIdx].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        inMemoryPayrollRuns[existingIdx] = runRecord;
        // Remove existing items
        for (let i = inMemoryPayrollItems.length - 1; i >= 0; i--) {
          if (inMemoryPayrollItems[i].payrollRunId === runId) {
            inMemoryPayrollItems.splice(i, 1);
          }
        }
      } else {
        inMemoryPayrollRuns.push(runRecord);
      }

      for (const it of items) {
        it.payrollRunId = runRecord.id;
        inMemoryPayrollItems.push(it);
      }
    }

    await auditService.log({
      companyId,
      actorUserId,
      action: 'PAYROLL_DRAFT_GENERATED',
      entityType: 'PayrollRun',
      entityId: runRecord.id,
      afterData: { month, year, totalNet, employeeCount: items.length },
    });

    return { ...runRecord, items };
  },

  async getPayrollRuns(companyId: string): Promise<PayrollRun[]> {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(
        `SELECT 
           id, company_id AS "companyId", month, year, status,
           total_gross::float AS "totalGross", total_deductions::float AS "totalDeductions",
           total_net::float AS "totalNet", employee_count AS "employeeCount",
           finalized_by AS "finalizedBy", finalized_at AS "finalizedAt",
           created_at AS "createdAt", updated_at AS "updatedAt"
         FROM payroll_runs
         WHERE company_id = $1
         ORDER BY year DESC, month DESC`,
        [companyId]
      );
      return result.rows;
    }

    return inMemoryPayrollRuns
      .filter((r) => r.companyId === companyId)
      .sort((a, b) => b.year - a.year || b.month - a.month);
  },

  async getPayrollRunById(companyId: string, runId: string): Promise<PayrollRunDetail | null> {
    const pool = getDbPool();
    if (pool) {
      const runRes = await pool.query(
        `SELECT 
           id, company_id AS "companyId", month, year, status,
           total_gross::float AS "totalGross", total_deductions::float AS "totalDeductions",
           total_net::float AS "totalNet", employee_count AS "employeeCount",
           finalized_by AS "finalizedBy", finalized_at AS "finalizedAt",
           created_at AS "createdAt", updated_at AS "updatedAt"
         FROM payroll_runs
         WHERE id = $1 AND company_id = $2`,
        [runId, companyId]
      );
      if (runRes.rows.length === 0) return null;
      const run: PayrollRun = runRes.rows[0];

      const itemsRes = await pool.query(
        `SELECT 
           pi.id, pi.payroll_run_id AS "payrollRunId", pi.company_id AS "companyId", pi.employee_id AS "employeeId",
           e.employee_code AS "employeeCode", e.full_name AS "employeeName",
           d.name AS "departmentName", des.name AS "designationName",
           pi.basic_salary::float AS "basicSalary", pi.hra::float AS "hra",
           pi.medical_allowance::float AS "medicalAllowance", pi.gross_salary::float AS "grossSalary",
           pi.working_days AS "workingDays", pi.present_days::float AS "presentDays",
           pi.absent_days::float AS "absentDays", pi.unpaid_leave_days::float AS "unpaidLeaveDays",
           pi.absent_deduction::float AS "absentDeduction", pi.unpaid_leave_deduction::float AS "unpaidLeaveDeduction",
           pi.tax_withholding::float AS "taxWithholding", pi.net_salary::float AS "netSalary",
           pi.created_at AS "createdAt", pi.updated_at AS "updatedAt"
         FROM payroll_items pi
         JOIN employees e ON pi.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations des ON e.designation_id = des.id
         WHERE pi.payroll_run_id = $1
         ORDER BY e.employee_code ASC`,
        [runId]
      );

      return { ...run, items: itemsRes.rows };
    }

    const run = inMemoryPayrollRuns.find((r) => r.id === runId && r.companyId === companyId);
    if (!run) return null;

    const items = inMemoryPayrollItems
      .filter((i) => i.payrollRunId === runId)
      .map((item) => {
        const emp = inMemoryEmployees.find((e) => e.id === item.employeeId);
        return {
          ...item,
          employeeCode: emp?.employeeCode || item.employeeCode,
          employeeName: emp?.fullName || item.employeeName,
          departmentName: emp?.departmentName || item.departmentName,
          designationName: emp?.designationName || item.designationName,
        };
      });

    return { ...run, items };
  },

  async finalizePayrollRun(companyId: string, runId: string, actorUserId: string): Promise<PayrollRunDetail> {
    const run = await this.getPayrollRunById(companyId, runId);
    if (!run) {
      const err: any = new Error('Payroll run not found.');
      err.statusCode = 404;
      throw err;
    }

    if (run.status === 'FINALIZED') {
      const err: any = new Error('Payroll run is already finalized.');
      err.statusCode = 400;
      throw err;
    }

    const finalizedAt = new Date().toISOString();
    const pool = getDbPool();

    if (pool) {
      await pool.query(
        `UPDATE payroll_runs
         SET status = 'FINALIZED', finalized_by = $1, finalized_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [actorUserId, runId, companyId]
      );
    } else {
      const r = inMemoryPayrollRuns.find((item) => item.id === runId);
      if (r) {
        r.status = 'FINALIZED';
        r.finalizedBy = actorUserId;
        r.finalizedAt = finalizedAt;
        r.updatedAt = finalizedAt;
      }
    }

    // Trigger notification for each employee in the run
    for (const it of run.items) {
      const emp = await this.getEmployeeById(companyId, it.employeeId);
      if (emp?.userId) {
        await this.createNotification(companyId, emp.userId, {
          title: 'Payslip Released',
          message: `Your payslip for ${run.month}/${run.year} has been generated and released.`,
          type: 'PAYROLL',
          link: '/my-payslips',
        });
      }
    }

    await auditService.log({
      companyId,
      actorUserId,
      action: 'PAYROLL_FINALIZED',
      entityType: 'PayrollRun',
      entityId: runId,
      afterData: { month: run.month, year: run.year, totalNet: run.totalNet, finalizedBy: actorUserId },
    });

    const updated = (await this.getPayrollRunById(companyId, runId))!;
    return updated;
  },

  async getEmployeePayslips(companyId: string, employeeId: string): Promise<PayrollItem[]> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT 
           pi.id, pi.payroll_run_id AS "payrollRunId", pi.company_id AS "companyId", pi.employee_id AS "employeeId",
           e.employee_code AS "employeeCode", e.full_name AS "employeeName",
           d.name AS "departmentName", des.name AS "designationName",
           pi.basic_salary::float AS "basicSalary", pi.hra::float AS "hra",
           pi.medical_allowance::float AS "medicalAllowance", pi.gross_salary::float AS "grossSalary",
           pi.working_days AS "workingDays", pi.present_days::float AS "presentDays",
           pi.absent_days::float AS "absentDays", pi.unpaid_leave_days::float AS "unpaidLeaveDays",
           pi.absent_deduction::float AS "absentDeduction", pi.unpaid_leave_deduction::float AS "unpaidLeaveDeduction",
           pi.tax_withholding::float AS "taxWithholding", pi.net_salary::float AS "netSalary",
           pi.created_at AS "createdAt", pi.updated_at AS "updatedAt",
           pr.month, pr.year
         FROM payroll_items pi
         JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
         JOIN employees e ON pi.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations des ON e.designation_id = des.id
         WHERE pi.company_id = $1 AND pi.employee_id = $2 AND pr.status = 'FINALIZED'
         ORDER BY pr.year DESC, pr.month DESC`,
        [companyId, employeeId]
      );
      return res.rows;
    }

    const finalizedRunIds = inMemoryPayrollRuns
      .filter((r) => r.companyId === companyId && r.status === 'FINALIZED')
      .map((r) => r.id);

    return inMemoryPayrollItems
      .filter((i) => i.employeeId === employeeId && finalizedRunIds.includes(i.payrollRunId))
      .map((i) => {
        const emp = inMemoryEmployees.find((e) => e.id === employeeId);
        const run = inMemoryPayrollRuns.find((r) => r.id === i.payrollRunId);
        return {
          ...i,
          employeeCode: emp?.employeeCode || i.employeeCode,
          employeeName: emp?.fullName || i.employeeName,
          departmentName: emp?.departmentName || i.departmentName,
          designationName: emp?.designationName || i.designationName,
          month: run?.month,
          year: run?.year,
        } as any;
      });
  },

  async getEmployeePayslipById(
    companyId: string,
    employeeId: string,
    itemId: string
  ): Promise<PayrollItem | null> {
    const list = await this.getEmployeePayslips(companyId, employeeId);
    return list.find((item) => item.id === itemId) || null;
  },

  // -------------------------------------------------------------
  // PHASE 7 ANNOUNCEMENTS & NOTIFICATIONS
  // -------------------------------------------------------------
  async createAnnouncement(
    companyId: string,
    authorUserId: string,
    data: { title: string; content: string; isPinned?: boolean }
  ): Promise<Announcement> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO announcements (company_id, author_user_id, title, content, is_pinned)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, company_id AS "companyId", author_user_id AS "authorUserId",
                   title, content, is_pinned AS "isPinned",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [companyId, authorUserId, data.title.trim(), data.content.trim(), data.isPinned ?? false]
      );
      const ann = res.rows[0];
      const author = await this.findUserById(authorUserId);
      return { ...ann, authorName: author?.fullName };
    }

    const author = await this.findUserById(authorUserId);
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      companyId,
      authorUserId,
      authorName: author?.fullName,
      title: data.title.trim(),
      content: data.content.trim(),
      isPinned: data.isPinned ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryAnnouncements.unshift(newAnn);
    return newAnn;
  },

  async getAnnouncements(companyId: string): Promise<Announcement[]> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT a.id, a.company_id AS "companyId", a.author_user_id AS "authorUserId",
                u.full_name AS "authorName", a.title, a.content, a.is_pinned AS "isPinned",
                a.created_at AS "createdAt", a.updated_at AS "updatedAt"
         FROM announcements a
         JOIN users u ON a.author_user_id = u.id
         WHERE a.company_id = $1
         ORDER BY a.is_pinned DESC, a.created_at DESC`,
        [companyId]
      );
      return res.rows;
    }

    return inMemoryAnnouncements
      .filter((a) => a.companyId === companyId)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  },

  async deleteAnnouncement(companyId: string, announcementId: string, actorUserId: string): Promise<boolean> {
    const pool = getDbPool();
    if (pool) {
      await pool.query(`DELETE FROM announcements WHERE id = $1 AND company_id = $2`, [
        announcementId,
        companyId,
      ]);
    } else {
      const idx = inMemoryAnnouncements.findIndex(
        (a) => a.id === announcementId && a.companyId === companyId
      );
      if (idx >= 0) inMemoryAnnouncements.splice(idx, 1);
    }

    await auditService.log({
      companyId,
      actorUserId,
      action: 'ANNOUNCEMENT_DELETED',
      entityType: 'Announcement',
      entityId: announcementId,
    });
    return true;
  },

  async createNotification(
    companyId: string,
    userId: string,
    data: { title: string; message: string; type: any; link?: string }
  ): Promise<AppNotification> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO notifications (company_id, user_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, company_id AS "companyId", user_id AS "userId", title, message,
                   type, is_read AS "isRead", link, created_at AS "createdAt"`,
        [companyId, userId, data.title, data.message, data.type || 'SYSTEM', data.link || null]
      );
      return res.rows[0];
    }

    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId,
      userId,
      title: data.title,
      message: data.message,
      type: data.type || 'SYSTEM',
      isRead: false,
      link: data.link,
      createdAt: new Date().toISOString(),
    };
    inMemoryNotifications.unshift(notif);
    return notif;
  },

  async getNotifications(companyId: string, userId: string): Promise<AppNotification[]> {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query(
        `SELECT id, company_id AS "companyId", user_id AS "userId", title, message,
                type, is_read AS "isRead", link, created_at AS "createdAt"
         FROM notifications
         WHERE company_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT 50`,
        [companyId, userId]
      );
      return res.rows;
    }

    return inMemoryNotifications
      .filter((n) => n.companyId === companyId && n.userId === userId)
      .slice(0, 50);
  },

  async markNotificationAsRead(companyId: string, notificationId: string, userId: string): Promise<void> {
    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND company_id = $2 AND user_id = $3`,
        [notificationId, companyId, userId]
      );
    } else {
      const notif = inMemoryNotifications.find(
        (n) => n.id === notificationId && n.companyId === companyId && n.userId === userId
      );
      if (notif) notif.isRead = true;
    }
  },

  // -------------------------------------------------------------
  // PHASE 7 DASHBOARD SUMMARY & ANALYTICS
  // -------------------------------------------------------------
  async getDashboardSummary(companyId: string): Promise<DashboardSummary> {
    const company = await this.getCompanyById(companyId);
    const tz = company?.timezone || 'UTC';
    const today = getCompanyLocalDateString(new Date(), tz);

    const empRes = await this.listEmployees(companyId, { pageSize: 1000, employmentStatus: 'ACTIVE' });
    const totalEmployees = empRes.total;

    // Today's attendance
    const todaySummary = await this.getCompanyAttendanceSummary(companyId, today);
    const presentToday = todaySummary.presentCount;
    const lateToday = todaySummary.lateCount;
    const onLeaveToday = todaySummary.onLeaveCount;

    // Pending leaves
    const leavesRes = await this.getCompanyLeaveRequests(companyId, { status: 'PENDING', pageSize: 1 });
    const pendingLeaves = leavesRes.total;

    // Last payroll total
    const runs = await this.getPayrollRuns(companyId);
    const finalizedRun = runs.find((r) => r.status === 'FINALIZED');
    const lastPayrollTotal = finalizedRun ? finalizedRun.totalNet : 0;

    // Department headcounts
    const deptHeadcountsMap: { [name: string]: number } = {};
    for (const emp of empRes.items) {
      const dName = emp.departmentName || 'Unassigned';
      deptHeadcountsMap[dName] = (deptHeadcountsMap[dName] || 0) + 1;
    }
    const departmentHeadcounts = Object.keys(deptHeadcountsMap).map((dName) => ({
      departmentName: dName,
      count: deptHeadcountsMap[dName],
    }));

    const attendanceRate =
      totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    return {
      totalEmployees,
      presentToday,
      onLeaveToday,
      lateToday,
      pendingLeaves,
      lastPayrollTotal,
      departmentHeadcounts,
      attendanceRate,
    };
  },

  async getAttendanceTrends(companyId: string, days = 7): Promise<AttendanceAnalyticsTrend[]> {
    const company = await this.getCompanyById(companyId);
    const tz = company?.timezone || 'UTC';
    const todayStr = getCompanyLocalDateString(new Date(), tz);
    const todayDate = new Date(`${todayStr}T00:00:00Z`);

    const trends: AttendanceAnalyticsTrend[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setUTCDate(todayDate.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const summary = await this.getCompanyAttendanceSummary(companyId, dateStr);
      trends.push({
        date: dateStr,
        present: summary.presentCount,
        late: summary.lateCount,
        absent: summary.absentCount,
        onLeave: summary.onLeaveCount,
      });
    }

    return trends;
  },
};
