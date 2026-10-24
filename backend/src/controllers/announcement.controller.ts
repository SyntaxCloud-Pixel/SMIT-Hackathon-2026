import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storeService } from '../services/store.service';
import { AnnouncementCreateSchema } from '@hcm-lite/shared';
import { logger } from '../utils/logger';

export const announcementController = {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const announcements = await storeService.getAnnouncements(user.companyId);
      return res.json(announcements);
    } catch (err: any) {
      logger.error('Failed to list announcements', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const parsed = AnnouncementCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.issues,
        });
      }

      const announcement = await storeService.createAnnouncement(
        user.companyId,
        user.id,
        parsed.data
      );

      return res.status(201).json(announcement);
    } catch (err: any) {
      logger.error('Failed to create announcement', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      await storeService.deleteAnnouncement(user.companyId, id, user.id);
      return res.json({ success: true, message: 'Announcement deleted.' });
    } catch (err: any) {
      logger.error('Failed to delete announcement', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },
};
