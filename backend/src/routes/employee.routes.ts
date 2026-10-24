import { Router } from 'express';
import {
  EmployeeRegisterSchema,
  EmployeeUpdateSchema,
  EmployeeStatusUpdateSchema,
} from '@hcm-lite/shared';
import {
  listEmployees,
  getEmployee,
  registerEmployee,
  updateEmployee,
  updateEmployeeStatus,
  importCsvPreview,
  importCsvCommit,
  exportEmployeesCsv,
} from '../controllers/employee.controller';
import {
  requireAuth,
  requireActiveAccount,
  requireRole,
  requireCompanyScope,
} from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(requireAuth, requireActiveAccount, requireCompanyScope);

// Employee Directory & Profile
router.get('/', listEmployees);
router.get('/export/csv', requireRole(['ADMIN', 'HR']), exportEmployeesCsv);
router.get('/:id', getEmployee);

// Registration & Management (Admin & HR)
router.post('/', requireRole(['ADMIN', 'HR']), validate(EmployeeRegisterSchema), registerEmployee);
router.put('/:id', requireRole(['ADMIN', 'HR']), validate(EmployeeUpdateSchema), updateEmployee);
router.patch('/:id/status', requireRole(['ADMIN', 'HR']), validate(EmployeeStatusUpdateSchema), updateEmployeeStatus);

// CSV Import
router.post('/import/preview', requireRole(['ADMIN', 'HR']), importCsvPreview);
router.post('/import/commit', requireRole(['ADMIN', 'HR']), importCsvCommit);

export default router;
