import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';

export async function listDesignations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const departmentId = req.query.departmentId as string;
    const search = req.query.search as string;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

    const result = await storeService.listDesignations(companyId, { departmentId, search, isActive, page, pageSize });
    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, 'FETCH_DESIGNATIONS_ERROR', err.message || 'Failed to list designations', 500);
  }
}

export async function createDesignation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const actorId = req.user!.id;
    const designation = await storeService.createDesignation(companyId, actorId, req.body);
    sendSuccess(res, designation, 'Designation created successfully', 201);
  } catch (err: any) {
    sendError(res, 'CREATE_DESIGNATION_ERROR', err.message, 400);
  }
}

export async function updateDesignation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const actorId = req.user!.id;
    const updated = await storeService.updateDesignation(companyId, id, actorId, req.body);
    sendSuccess(res, updated, 'Designation updated successfully');
  } catch (err: any) {
    sendError(res, 'UPDATE_DESIGNATION_ERROR', err.message, 400);
  }
}

export async function deactivateDesignation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { isActive } = req.body;
    const actorId = req.user!.id;

    const updated = await storeService.deactivateDesignation(companyId, id, actorId, isActive);
    sendSuccess(res, updated, `Designation ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (err: any) {
    sendError(res, 'DEACTIVATE_DESIGNATION_ERROR', err.message, 400);
  }
}
