import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { auditService } from '../services/audit.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getCompanyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const companyId = req.companyId!;
  const company = await storeService.getCompanyById(companyId);
  if (!company) {
    sendError(res, 'NOT_FOUND', 'Company profile not found', 404);
    return;
  }
  sendSuccess(res, company);
}

export async function listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const companyId = req.companyId!;
  const users = await storeService.getUsersByCompany(companyId);
  sendSuccess(res, users);
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { isActive } = req.body;
  const actorId = req.user!.id;

  if (id === actorId && !isActive) {
    sendError(res, 'FORBIDDEN', 'Administrators cannot deactivate their own account', 400);
    return;
  }

  const updated = await storeService.updateUserStatus(id, isActive, actorId);
  if (!updated) {
    sendError(res, 'NOT_FOUND', 'User record not found', 404);
    return;
  }

  sendSuccess(res, updated, `User account ${isActive ? 'activated' : 'deactivated'} successfully`);
}

export async function getLeaveTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
  const companyId = req.companyId!;
  const leaveTypes = await storeService.getLeaveTypes(companyId);
  sendSuccess(res, leaveTypes);
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const companyId = req.companyId!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const logs = await auditService.getLogs(companyId, limit);
  sendSuccess(res, logs);
}
