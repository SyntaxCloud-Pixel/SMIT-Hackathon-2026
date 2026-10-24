import { Router } from 'express';
import { requireAuth, requireActiveAccount } from '../middleware/auth';
import { notificationController } from '../controllers/notification.controller';

const router = Router();

router.use(requireAuth);
router.use(requireActiveAccount);

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
