import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { logger } from '../utils/logger';

export const dashboardController = {
  async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const summary = await storeService.getDashboardSummary(user.companyId);
      return res.json(summary);
    } catch (err: any) {
      logger.error('Failed to get dashboard summary', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async getAttendanceTrends(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const days = Number(req.query.days) || 7;
      const trends = await storeService.getAttendanceTrends(user.companyId, days);
      return res.json(trends);
    } catch (err: any) {
      logger.error('Failed to get attendance trends', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },
};
