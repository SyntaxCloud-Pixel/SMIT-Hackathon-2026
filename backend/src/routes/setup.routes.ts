import { Router } from 'express';
import { CompanySetupRequestSchema } from '@hcm-lite/shared';
import { getSetupStatus, initializeSetup } from '../controllers/setup.controller';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/status', getSetupStatus);
router.post('/initialize', validate(CompanySetupRequestSchema), initializeSetup);

export default router;
