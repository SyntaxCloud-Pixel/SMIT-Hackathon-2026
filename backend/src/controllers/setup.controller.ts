import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { storeService } from '../services/store.service';
import { sendSuccess, sendError } from '../utils/response';
import { SetupStatusResponse, AuthSession } from '@hcm-lite/shared';
import { logger } from '../utils/logger';

export async function getSetupStatus(req: Request, res: Response): Promise<void> {
  try {
    const { completed, company } = await storeService.isSetupCompleted();
    const data: SetupStatusResponse = {
      setupCompleted: completed,
      company: company
        ? {
            id: company.id,
            name: company.name,
            timezone: company.timezone,
            officeStartTime: company.officeStartTime,
          }
        : undefined,
    };
    sendSuccess(res, data, 'Setup status retrieved');
  } catch (err: any) {
    logger.error('Error retrieving setup status', err);
    sendError(res, 'SETUP_STATUS_ERROR', 'Failed to retrieve setup status', 500);
  }
}

export async function initializeSetup(req: Request, res: Response): Promise<void> {
  try {
    const { company, admin } = await storeService.initializeCompany(req.body);

    const token = jwt.sign(
      {
        id: admin.id,
        companyId: company.id,
        email: admin.email,
        role: admin.role,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const session: AuthSession = {
      user: admin,
      company: {
        id: company.id,
        name: company.name,
        timezone: company.timezone,
      },
      token,
    };

    sendSuccess(res, session, 'Company and initial administrator initialized successfully', 201);
  } catch (err: any) {
    logger.error('Initialization error', err);
    if (err.message && err.message.includes('SETUP_ALREADY_COMPLETED')) {
      sendError(res, 'SETUP_ALREADY_COMPLETED', 'Initial company setup has already been completed.', 400);
      return;
    }
    sendError(res, 'INITIALIZATION_FAILED', err.message || 'Failed to complete company setup', 500);
  }
}
