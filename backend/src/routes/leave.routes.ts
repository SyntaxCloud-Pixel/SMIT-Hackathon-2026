import { Router } from 'express';
import { leaveController } from '../controllers/leave.controller';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  LeaveRequestSubmitSchema,
  LeaveRequestReviewSchema,
  LeaveWorkingDaysEstimateSchema,
} from '@hcm-lite/shared';

export const leaveRoutes = Router();

// Employee & all active authenticated users
leaveRoutes.get('/balances', requireAuth, requireActiveAccount, leaveController.getBalances);
leaveRoutes.post(
  '/estimate',
  requireAuth,
  requireActiveAccount,
  validate(LeaveWorkingDaysEstimateSchema),
  leaveController.estimateWorkingDays
);
leaveRoutes.post(
  '/requests',
  requireAuth,
  requireActiveAccount,
  validate(LeaveRequestSubmitSchema),
  leaveController.submitRequest
);
leaveRoutes.get('/my-requests', requireAuth, requireActiveAccount, leaveController.getMyRequests);
leaveRoutes.patch(
  '/requests/:id/cancel',
  requireAuth,
  requireActiveAccount,
  leaveController.cancelRequest
);

// Admin & HR management endpoints
leaveRoutes.get(
  '/company',
  requireAuth,
  requireActiveAccount,
  requireRole(['ADMIN', 'HR']),
  leaveController.getCompanyRequests
);
leaveRoutes.patch(
  '/requests/:id/review',
  requireAuth,
  requireActiveAccount,
  requireRole(['ADMIN', 'HR']),
  validate(LeaveRequestReviewSchema),
  leaveController.reviewRequest
);
