import { Router, Response } from 'express';
import { UpdateUserStatusSchema, LeaveTypeUpdateSchema } from '@hcm-lite/shared';
import {
  getCompanyProfile,
  listUsers,
  updateUserStatus,
  getLeaveTypes,
  getAuditLogs,
} from '../controllers/organization.controller';
import {
  requireAuth,
  requireActiveAccount,
  requireRole,
  requireCompanyScope,
  AuthenticatedRequest,
} from '../middleware/auth';
import { validate } from '../middleware/validate';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.use(requireAuth, requireActiveAccount, requireCompanyScope);

// Company settings & profile
router.get('/', getCompanyProfile);

// User management
router.get('/users', requireRole(['ADMIN', 'HR']), listUsers);
router.patch('/users/:id/status', requireRole(['ADMIN']), validate(UpdateUserStatusSchema), updateUserStatus);

// Leave configurations
router.get('/leave-types', getLeaveTypes);
router.patch(
  '/leave-types/:id',
  requireRole(['ADMIN']),
  validate(LeaveTypeUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.companyId!;
      const { id } = req.params;
      const actorId = req.user!.id;
      const updated = await storeService.updateLeaveType(companyId, id, actorId, req.body);
      sendSuccess(res, updated, 'Leave type quota updated successfully');
    } catch (err: any) {
      sendError(res, 'UPDATE_LEAVE_TYPE_ERROR', err.message, 400);
    }
  }
);

// Audit logs (Admin only)
router.get('/audit-logs', requireRole(['ADMIN']), getAuditLogs);

export default router;
