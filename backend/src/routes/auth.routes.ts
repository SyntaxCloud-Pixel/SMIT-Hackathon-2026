import { Router } from 'express';
import { LoginRequestSchema } from '@hcm-lite/shared';
import { login, getCurrentUser, logout } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth, requireActiveAccount } from '../middleware/auth';

const router = Router();

router.post('/login', validate(LoginRequestSchema), login);
router.get('/me', requireAuth, requireActiveAccount, getCurrentUser);
router.post('/logout', requireAuth, logout);

export default router;
