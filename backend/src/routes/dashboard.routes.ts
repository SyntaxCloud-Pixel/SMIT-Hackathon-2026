import { Router } from 'express';
import { requireAuth, requireActiveAccount } from '../middleware/auth';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.use(requireAuth);
router.use(requireActiveAccount);

router.get('/summary', dashboardController.getSummary);
router.get('/attendance-trends', dashboardController.getAttendanceTrends);

export default router;
