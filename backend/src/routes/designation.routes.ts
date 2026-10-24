import { Router } from 'express';
import { DesignationSchema } from '@hcm-lite/shared';
import {
  listDesignations,
  createDesignation,
  updateDesignation,
  deactivateDesignation,
} from '../controllers/designation.controller';
import {
  requireAuth,
  requireActiveAccount,
  requireRole,
  requireCompanyScope,
} from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(requireAuth, requireActiveAccount, requireCompanyScope);

router.get('/', requireRole(['ADMIN', 'HR']), listDesignations);
router.post('/', requireRole(['ADMIN', 'HR']), validate(DesignationSchema), createDesignation);
router.put('/:id', requireRole(['ADMIN', 'HR']), validate(DesignationSchema), updateDesignation);
router.patch('/:id/status', requireRole(['ADMIN', 'HR']), deactivateDesignation);

export default router;
