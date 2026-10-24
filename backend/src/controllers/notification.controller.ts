import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { logger } from '../utils/logger';

export const notificationController = {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const notifications = await storeService.getNotifications(
        user.companyId,
        user.id
      );
      return res.json(notifications);
    } catch (err: any) {
      logger.error('Failed to list notifications', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      await storeService.markNotificationAsRead(user.companyId, id, user.id);
      return res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to mark notification as read', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },
};
