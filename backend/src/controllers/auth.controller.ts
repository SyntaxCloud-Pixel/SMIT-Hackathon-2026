import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthSession } from '@hcm-lite/shared';
import { env } from '../config/env';
import { storeService } from '../services/store.service';
import { sendError, sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { auditService } from '../services/audit.service';

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const userRecord = await storeService.findUserByEmail(email);
    if (!userRecord) {
      sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      return;
    }

    const { user, passwordHash } = userRecord;

    // Check account active status
    if (!user.isActive) {
      sendError(
        res,
        'ACCOUNT_DEACTIVATED',
        'Your account has been deactivated. Please contact your company administrator.',
        403
      );
      return;
    }

    // Verify password hash
    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      return;
    }

    const company = await storeService.getCompanyById(user.companyId);
    if (!company) {
      sendError(res, 'COMPANY_NOT_FOUND', 'Associated company record not found', 404);
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        companyId: user.companyId,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const session: AuthSession = {
      user,
      company: {
        id: company.id,
        name: company.name,
        timezone: company.timezone,
      },
      token,
    };

    // Audit log successful authentication event
    await auditService.log({
      companyId: user.companyId,
      actorUserId: user.id,
      action: 'USER_LOGIN',
      entityType: 'Session',
      entityId: user.id,
    });

    sendSuccess(res, session, 'Authentication successful');
  } catch (error: any) {
    logger.error('Login error', error);
    sendError(res, 'LOGIN_FAILED', 'Authentication service error', 500);
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    return;
  }

  const company = await storeService.getCompanyById(req.user.companyId);

  sendSuccess(
    res,
    {
      user: req.user,
      company: company
        ? {
            id: company.id,
            name: company.name,
            timezone: company.timezone,
            officeStartTime: company.officeStartTime,
          }
        : null,
    },
    'Session retrieved successfully'
  );
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.user) {
    await auditService.log({
      companyId: req.user.companyId,
      actorUserId: req.user.id,
      action: 'USER_LOGOUT',
      entityType: 'Session',
      entityId: req.user.id,
    });
  }
  sendSuccess(res, { loggedOut: true }, 'Signed out successfully');
}
