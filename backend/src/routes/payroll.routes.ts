import { Router } from 'express';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { payrollController } from '../controllers/payroll.controller';

const router = Router();

// Apply auth to all payroll routes
router.use(requireAuth);
router.use(requireActiveAccount);

// Admin & HR management endpoints
router.post(
  '/draft',
  requireRole(['ADMIN', 'HR']),
  payrollController.generateDraft
);

router.get(
  '/runs',
  requireRole(['ADMIN', 'HR']),
  payrollController.listRuns
);

router.get(
  '/runs/:id',
  requireRole(['ADMIN', 'HR']),
  payrollController.getRunById
);

router.post(
  '/runs/:id/finalize',
  requireRole(['ADMIN', 'HR']),
  payrollController.finalizeRun
);

router.get(
  '/runs/:id/export',
  requireRole(['ADMIN', 'HR']),
  payrollController.exportRunCsv
);

// Employee self-service payslip endpoints
router.get(
  '/my-payslips',
  payrollController.getMyPayslips
);

router.get(
  '/my-payslips/:id',
  payrollController.getMyPayslipById
);

export default router;
