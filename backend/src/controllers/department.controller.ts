import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';

export async function listDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const search = req.query.search as string;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

    const result = await storeService.listDepartments(companyId, { search, isActive, page, pageSize });
    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, 'FETCH_DEPARTMENTS_ERROR', err.message || 'Failed to list departments', 500);
  }
}

export async function createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const actorId = req.user!.id;
    const department = await storeService.createDepartment(companyId, actorId, req.body);
    sendSuccess(res, department, 'Department created successfully', 201);
  } catch (err: any) {
    sendError(res, 'CREATE_DEPARTMENT_ERROR', err.message, 400);
  }
}

export async function updateDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const actorId = req.user!.id;
    const updated = await storeService.updateDepartment(companyId, id, actorId, req.body);
    sendSuccess(res, updated, 'Department updated successfully');
  } catch (err: any) {
    sendError(res, 'UPDATE_DEPARTMENT_ERROR', err.message, 400);
  }
}

export async function deactivateDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { isActive } = req.body;
    const actorId = req.user!.id;

    const updated = await storeService.deactivateDepartment(companyId, id, actorId, isActive);
    sendSuccess(res, updated, `Department ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (err: any) {
    sendError(res, 'DEACTIVATE_DEPARTMENT_ERROR', err.message, 400);
  }
}
