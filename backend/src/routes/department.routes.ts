import { Router } from 'express';
import { DepartmentSchema } from '@hcm-lite/shared';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
} from '../controllers/department.controller';
import {
  requireAuth,
  requireActiveAccount,
  requireRole,
  requireCompanyScope,
} from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(requireAuth, requireActiveAccount, requireCompanyScope);

router.get('/', requireRole(['ADMIN', 'HR']), listDepartments);
router.post('/', requireRole(['ADMIN', 'HR']), validate(DepartmentSchema), createDepartment);
router.put('/:id', requireRole(['ADMIN', 'HR']), validate(DepartmentSchema), updateDepartment);
router.patch('/:id/status', requireRole(['ADMIN', 'HR']), deactivateDepartment);

export default router;
