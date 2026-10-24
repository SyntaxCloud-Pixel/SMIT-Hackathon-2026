import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';
import { getCompanyLocalDateString } from '../utils/attendance.utils';
import { AttendanceTodayResponse } from '@hcm-lite/shared';

export const attendanceController = {
  /**
   * POST /api/attendance/check-in
   * Authenticated employee check-in
   */
  async checkIn(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const employee = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!employee) {
        return sendError(res, 'EMPLOYEE_RECORD_NOT_FOUND', 'No employee profile linked to this user account.', 404);
      }

      const notes = req.body?.notes;
      const record = await storeService.checkInAttendance(
        user.companyId,
        employee.id,
        user.id,
        new Date(),
        notes
      );

      return sendSuccess(res, record, 'Check-in recorded successfully.', 201);
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'ATTENDANCE_ALREADY_CHECKED_IN') {
        return sendError(res, 'ATTENDANCE_ALREADY_CHECKED_IN', err.message, 409);
      }
      return sendError(res, 'CHECK_IN_FAILED', err.message || 'Failed to record check-in.', 500);
    }
  },

  /**
   * POST /api/attendance/check-out
   * Authenticated employee check-out
   */
  async checkOut(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const employee = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!employee) {
        return sendError(res, 'EMPLOYEE_RECORD_NOT_FOUND', 'No employee profile linked to this user account.', 404);
      }

      const notes = req.body?.notes;
      const record = await storeService.checkOutAttendance(
        user.companyId,
        employee.id,
        user.id,
        new Date(),
        notes
      );

      return sendSuccess(res, record, 'Check-out recorded successfully.', 200);
    } catch (err: any) {
      if (err.statusCode === 400 || err.code === 'ATTENDANCE_NOT_CHECKED_IN') {
        return sendError(res, 'ATTENDANCE_NOT_CHECKED_IN', err.message, 400);
      }
      if (err.statusCode === 409 || err.code === 'ATTENDANCE_ALREADY_CHECKED_OUT') {
        return sendError(res, 'ATTENDANCE_ALREADY_CHECKED_OUT', err.message, 409);
      }
      return sendError(res, 'CHECK_OUT_FAILED', err.message || 'Failed to record check-out.', 500);
    }
  },

  /**
   * GET /api/attendance/today
   * Get current user's today attendance status
   */
  async getToday(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const company = await storeService.getCompanyById(user.companyId);
      const employee = await storeService.getEmployeeByUserId(user.companyId, user.id);

      const serverNow = new Date();
      const timezone = company?.timezone || 'UTC';
      const dateStr = getCompanyLocalDateString(serverNow, timezone);

      let record = null;
      let canCheckIn = false;
      let canCheckOut = false;

      if (employee) {
        record = await storeService.getAttendanceToday(user.companyId, employee.id, dateStr);
        canCheckIn = !record || !record.checkIn;
        canCheckOut = Boolean(record && record.checkIn && !record.checkOut);
      }

      const responseData: AttendanceTodayResponse = {
        record,
        serverTime: serverNow.toISOString(),
        companyTimezone: timezone,
        canCheckIn,
        canCheckOut,
      };

      return sendSuccess(res, responseData);
    } catch (err: any) {
      return sendError(res, 'FETCH_TODAY_ATTENDANCE_FAILED', err.message, 500);
    }
  },

  /**
   * GET /api/attendance/my-history
   * Personal attendance history and monthly metrics
   */
  async getMyHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const employee = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!employee) {
        return sendError(res, 'EMPLOYEE_RECORD_NOT_FOUND', 'No employee profile linked to this user account.', 404);
      }

      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 31;

      const result = await storeService.getEmployeeAttendanceHistory(user.companyId, employee.id, {
        month,
        year,
        page,
        pageSize,
      });

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'FETCH_HISTORY_FAILED', err.message, 500);
    }
  },

  /**
   * GET /api/attendance/company
   * Company attendance oversight (Admin & HR only)
   */
  async getCompanyAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const filters = {
        date: req.query.date as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        departmentId: req.query.departmentId as string | undefined,
        status: req.query.status as any,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20,
      };

      const result = await storeService.getCompanyAttendanceList(user.companyId, filters);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'FETCH_COMPANY_ATTENDANCE_FAILED', err.message, 500);
    }
  },

  /**
   * GET /api/attendance/summary
   * Company daily attendance summary metrics (Admin & HR only)
   */
  async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const company = await storeService.getCompanyById(user.companyId);
      const targetDate =
        (req.query.date as string) ||
        getCompanyLocalDateString(new Date(), company?.timezone || 'UTC');

      const summary = await storeService.getCompanyAttendanceSummary(user.companyId, targetDate);
      return sendSuccess(res, summary);
    } catch (err: any) {
      return sendError(res, 'FETCH_SUMMARY_FAILED', err.message, 500);
    }
  },

  /**
   * PATCH /api/attendance/:id/correct
   * Admin & HR correction of attendance record
   */
  async correct(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const attendanceId = req.params.id;
      const input = req.body;

      const updated = await storeService.correctAttendance(
        user.companyId,
        attendanceId,
        user.id,
        input
      );

      return sendSuccess(res, updated, 'Attendance record corrected successfully.');
    } catch (err: any) {
      if (err.message.includes('not found')) {
        return sendError(res, 'NOT_FOUND', err.message, 404);
      }
      return sendError(res, 'CORRECTION_FAILED', err.message, 500);
    }
  },

  /**
   * GET /api/attendance/export/csv
   * Export attendance records to CSV with formula injection sanitization
   */
  async exportCsv(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const filters = {
        date: req.query.date as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        departmentId: req.query.departmentId as string | undefined,
        status: req.query.status as any,
        search: req.query.search as string | undefined,
        page: 1,
        pageSize: 5000,
      };

      const result = await storeService.getCompanyAttendanceList(user.companyId, filters);

      const sanitizeCsvField = (val: any): string => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        // Prevent CSV formula injection: '=', '+', '-', '@', '\t', '\r'
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'` + str;
        }
        return `"${str}"`;
      };

      const headers = [
        'Employee Code',
        'Full Name',
        'Department',
        'Date',
        'Check-In',
        'Check-Out',
        'Status',
        'Late (Mins)',
        'Worked (Mins)',
        'Is Corrected',
        'Correction Reason',
        'Notes',
      ];

      const csvRows = [headers.join(',')];

      for (const rec of result.items) {
        const row = [
          sanitizeCsvField(rec.employeeCode || ''),
          sanitizeCsvField(rec.employeeName || ''),
          sanitizeCsvField(rec.departmentName || ''),
          sanitizeCsvField(rec.attendanceDate),
          sanitizeCsvField(rec.checkIn || ''),
          sanitizeCsvField(rec.checkOut || ''),
          sanitizeCsvField(rec.status),
          sanitizeCsvField(rec.minutesLate),
          sanitizeCsvField(rec.workedMinutes),
          sanitizeCsvField(rec.isCorrected ? 'Yes' : 'No'),
          sanitizeCsvField(rec.correctionReason || ''),
          sanitizeCsvField(rec.notes || ''),
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\r\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    } catch (err: any) {
      return sendError(res, 'EXPORT_FAILED', err.message, 500);
    }
  },
};

