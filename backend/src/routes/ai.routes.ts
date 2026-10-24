import { Router } from 'express';
import { requireAuth, requireActiveAccount } from '../middleware/auth';
import { aiController } from '../controllers/ai.controller';

const router = Router();

router.use(requireAuth);
router.use(requireActiveAccount);

router.post('/chat', aiController.chat);

export default router;
