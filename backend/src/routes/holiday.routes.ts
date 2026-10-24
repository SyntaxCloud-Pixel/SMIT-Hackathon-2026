import { Router } from 'express';
import { HolidaySchema } from '@hcm-lite/shared';
import {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '../controllers/holiday.controller';
import {
  requireAuth,
  requireActiveAccount,
  requireRole,
  requireCompanyScope,
} from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(requireAuth, requireActiveAccount, requireCompanyScope);

// Accessible by all active company employees
router.get('/', listHolidays);

// Admin-only holiday management
router.post('/', requireRole(['ADMIN']), validate(HolidaySchema), createHoliday);
router.put('/:id', requireRole(['ADMIN']), validate(HolidaySchema), updateHoliday);
router.delete('/:id', requireRole(['ADMIN']), deleteHoliday);

export default router;
