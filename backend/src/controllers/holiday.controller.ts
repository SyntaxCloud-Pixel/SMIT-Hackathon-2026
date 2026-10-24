import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';

export async function listHolidays(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const search = req.query.search as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;

    const result = await storeService.listHolidays(companyId, { year, search, page, pageSize });
    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, 'FETCH_HOLIDAYS_ERROR', err.message || 'Failed to list holidays', 500);
  }
}

export async function createHoliday(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const actorId = req.user!.id;
    const holiday = await storeService.createHoliday(companyId, actorId, req.body);
    sendSuccess(res, holiday, 'Holiday created successfully', 201);
  } catch (err: any) {
    sendError(res, 'CREATE_HOLIDAY_ERROR', err.message, 400);
  }
}

export async function updateHoliday(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const actorId = req.user!.id;
    const updated = await storeService.updateHoliday(companyId, id, actorId, req.body);
    sendSuccess(res, updated, 'Holiday updated successfully');
  } catch (err: any) {
    sendError(res, 'UPDATE_HOLIDAY_ERROR', err.message, 400);
  }
}

export async function deleteHoliday(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { id } = req.params;
    const actorId = req.user!.id;
    await storeService.deleteHoliday(companyId, id, actorId);
    sendSuccess(res, { deleted: true }, 'Holiday deleted successfully');
  } catch (err: any) {
    sendError(res, 'DELETE_HOLIDAY_ERROR', err.message, 400);
  }
}
