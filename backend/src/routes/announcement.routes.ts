import { Router } from 'express';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { announcementController } from '../controllers/announcement.controller';

const router = Router();

router.use(requireAuth);
router.use(requireActiveAccount);

// All authenticated company users can view announcements
router.get('/', announcementController.list);

// Admin and HR can publish announcements
router.post('/', requireRole(['ADMIN', 'HR']), announcementController.create);

// Admin and HR can delete announcements
router.delete('/:id', requireRole(['ADMIN', 'HR']), announcementController.delete);

export default router;
