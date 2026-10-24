import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';

export const leaveController = {
  /**
   * GET /api/leaves/balances
   * Get leave balances for the authenticated employee
   */
  async getBalances(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      let employeeId = req.query.employeeId as string | undefined;

      if (!employeeId) {
        const emp = await storeService.getEmployeeByUserId(user.companyId, user.id);
        if (!emp) {
          return sendError(res, 'EMPLOYEE_RECORD_NOT_FOUND', 'No employee profile linked to this user account.', 404);
        }
        employeeId = emp.id;
      } else if (user.role === 'EMPLOYEE') {
        // Regular employee cannot view someone else's balances
        const emp = await storeService.getEmployeeByUserId(user.companyId, user.id);
        if (!emp || emp.id !== employeeId) {
          return sendError(res, 'FORBIDDEN', 'You are not authorized to view another employee leave balances.', 403);
        }
      }

      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getUTCFullYear();
      const balances = await storeService.getLeaveBalances(user.companyId, employeeId, year);
      return sendSuccess(res, balances);
    } catch (err: any) {
      return sendError(res, 'FETCH_BALANCES_FAILED', err.message, 500);
    }
  },

  /**
   * POST /api/leaves/estimate
   * Estimate working days in a date range skipping weekends and holidays
   */
  async estimateWorkingDays(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { startDate, endDate } = req.body;

      const estimate = await storeService.estimateLeaveWorkingDays(user.companyId, startDate, endDate);
      return sendSuccess(res, estimate);
    } catch (err: any) {
      return sendError(res, 'ESTIMATE_FAILED', err.message, 500);
    }
  },

  /**
   * POST /api/leaves/requests
   * Submit a new leave request
   */
  async submitRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const emp = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!emp) {
        return sendError(res, 'EMPLOYEE_RECORD_NOT_FOUND', 'No employee profile linked to this user account.', 404);
      }

      const request = await storeService.submitLeaveRequest(user.companyId, emp.id, user.id, req.body);
      return sendSuccess(res, request, 'Leave request submitted successfully.', 201);
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'LEAVE_OVERLAP_DETECTED') {
        return sendError(res, 'LEAVE_OVERLAP_DETECTED', err.message, 409);
      }
      if (err.statusCode === 422 || err.code === 'INSUFFICIENT_LEAVE_BALANCE') {
        return sendError(res, 'INSUFFICIENT_LEAVE_BALANCE', err.message, 422);
      }
      return sendError(res, 'LEAVE_SUBMIT_FAILED', err.message, 400);
    }
  },

  /**
   * GET /api/leaves/my-requests
   * List authenticated employee's leave requests
   */
  async getMyRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const emp = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!emp) {
        return sendError(res, 'EMPLOYEE_RECORD_NOT_FOUND', 'No employee profile linked to this user account.', 404);
      }

      const requests = await storeService.getMyLeaveRequests(user.companyId, emp.id);
      return sendSuccess(res, requests);
    } catch (err: any) {
      return sendError(res, 'FETCH_REQUESTS_FAILED', err.message, 500);
    }
  },

  /**
   * GET /api/leaves/company
   * Admin & HR: List and filter company leave requests
   */
  async getCompanyRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const filters = {
        status: req.query.status as any,
        departmentId: req.query.departmentId as string | undefined,
        leaveTypeId: req.query.leaveTypeId as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20,
      };

      const result = await storeService.getCompanyLeaveRequests(user.companyId, filters);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'FETCH_COMPANY_LEAVES_FAILED', err.message, 500);
    }
  },

  /**
   * PATCH /api/leaves/requests/:id/review
   * Admin & HR: Approve or reject leave request
   */
  async reviewRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const requestId = req.params.id;
      const { status, comments } = req.body;

      const updated = await storeService.reviewLeaveRequest(
        user.companyId,
        requestId,
        user.id,
        status,
        comments
      );

      return sendSuccess(res, updated, `Leave request ${status.toLowerCase()} successfully.`);
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'LEAVE_ALREADY_REVIEWED') {
        return sendError(res, 'LEAVE_ALREADY_REVIEWED', err.message, 409);
      }
      if (err.message.includes('not found')) {
        return sendError(res, 'NOT_FOUND', err.message, 404);
      }
      return sendError(res, 'REVIEW_FAILED', err.message, 500);
    }
  },

  /**
   * PATCH /api/leaves/requests/:id/cancel
   * Employee cancels their own pending request
   */
  async cancelRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const requestId = req.params.id;

      const emp = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!emp) {
        return sendError(res, 'EMPLOYEE_RECORD_NOT_FOUND', 'No employee profile linked to this user account.', 404);
      }

      const updated = await storeService.cancelLeaveRequest(
        user.companyId,
        requestId,
        emp.id,
        user.id
      );

      return sendSuccess(res, updated, 'Leave request cancelled successfully.');
    } catch (err: any) {
      if (err.statusCode === 403) {
        return sendError(res, 'FORBIDDEN', err.message, 403);
      }
      if (err.statusCode === 400) {
        return sendError(res, 'BAD_REQUEST', err.message, 400);
      }
      return sendError(res, 'CANCEL_FAILED', err.message, 500);
    }
  },
};
