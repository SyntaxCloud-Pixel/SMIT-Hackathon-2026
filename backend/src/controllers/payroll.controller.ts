import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { GeneratePayrollDraftSchema } from '@hcm-lite/shared';
import { logger } from '../utils/logger';

function sanitizeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export const payrollController = {
  async generateDraft(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const parsed = GeneratePayrollDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.issues,
        });
      }

      const { month, year } = parsed.data;
      const run = await storeService.generatePayrollDraft(
        user.companyId,
        month,
        year,
        user.id
      );

      return res.status(201).json(run);
    } catch (err: any) {
      logger.error('Failed to generate payroll draft', { error: err.message });
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  },

  async listRuns(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const runs = await storeService.getPayrollRuns(user.companyId);
      return res.json(runs);
    } catch (err: any) {
      logger.error('Failed to list payroll runs', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async getRunById(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const run = await storeService.getPayrollRunById(user.companyId, id);
      if (!run) {
        return res.status(404).json({ error: 'Payroll run not found' });
      }
      return res.json(run);
    } catch (err: any) {
      logger.error('Failed to get payroll run', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async finalizeRun(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const finalized = await storeService.finalizePayrollRun(
        user.companyId,
        id,
        user.id
      );
      return res.json(finalized);
    } catch (err: any) {
      logger.error('Failed to finalize payroll run', { error: err.message });
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  },

  async exportRunCsv(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const run = await storeService.getPayrollRunById(user.companyId, id);
      if (!run) {
        return res.status(404).json({ error: 'Payroll run not found' });
      }

      const headers = [
        'Employee Code',
        'Employee Name',
        'Department',
        'Designation',
        'Basic Salary',
        'HRA',
        'Medical Allowance',
        'Gross Salary',
        'Working Days',
        'Present Days',
        'Absent Days',
        'Unpaid Leave Days',
        'Absent Deduction',
        'Unpaid Leave Deduction',
        'Tax Withholding',
        'Net Salary',
      ];

      const rows = run.items.map((it) => [
        sanitizeCsv(it.employeeCode),
        sanitizeCsv(it.employeeName),
        sanitizeCsv(it.departmentName || ''),
        sanitizeCsv(it.designationName || ''),
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
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="payroll-${run.year}-${String(run.month).padStart(2, '0')}.csv"`
      );
      return res.status(200).send(csvContent);
    } catch (err: any) {
      logger.error('Failed to export payroll CSV', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async getMyPayslips(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const emp = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!emp) {
        return res.status(404).json({ error: 'Employee profile not associated with this account.' });
      }

      const payslips = await storeService.getEmployeePayslips(user.companyId, emp.id);
      return res.json(payslips);
    } catch (err: any) {
      logger.error('Failed to get employee payslips', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async getMyPayslipById(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const emp = await storeService.getEmployeeByUserId(user.companyId, user.id);
      if (!emp) {
        return res.status(404).json({ error: 'Employee profile not associated with this account.' });
      }

      const payslip = await storeService.getEmployeePayslipById(user.companyId, emp.id, id);
      if (!payslip) {
        return res.status(404).json({ error: 'Payslip not found' });
      }

      return res.json(payslip);
    } catch (err: any) {
      logger.error('Failed to get employee payslip detail', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },
};
