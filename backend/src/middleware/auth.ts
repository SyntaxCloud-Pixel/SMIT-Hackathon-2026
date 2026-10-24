import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, UserSummary } from '@hcm-lite/shared';
import { env } from '../config/env';
import { sendError } from '../utils/response';
import { storeService } from '../services/store.service';

export interface AuthenticatedRequest extends Request {
  user?: UserSummary;
  companyId?: string;
}

interface JwtPayload {
  id: string;
  companyId: string;
  email: string;
  role: UserRole;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'Authentication token missing or invalid', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Retrieve fresh user record from trusted server store to ensure live status & permissions
    const user = await storeService.findUserById(decoded.id);
    if (!user) {
      sendError(res, 'UNAUTHORIZED', 'Account does not exist or has been removed', 401);
      return;
    }

    // Attach verified user and company scope
    req.user = user;
    req.companyId = user.companyId;
    next();
  } catch (error) {
    sendError(res, 'TOKEN_EXPIRED_OR_INVALID', 'Session expired or token is invalid. Please sign in again.', 401);
  }
}

export function requireActiveAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  if (!req.user.isActive) {
    sendError(
      res,
      'ACCOUNT_DEACTIVATED',
      'Your account has been deactivated. Please contact your company administrator.',
      403
    );
    return;
  }

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        'FORBIDDEN',
        `Access denied. This action requires ${allowedRoles.join(' or ')} privileges.`,
        403
      );
      return;
    }

    next();
  };
}

export function requireCompanyScope(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !req.companyId) {
    sendError(res, 'UNAUTHORIZED', 'Company scope could not be established', 401);
    return;
  }

  // Ensure client cannot override or query across company boundary
  const targetCompanyId = req.params.companyId || req.query.companyId || req.body.companyId;
  if (targetCompanyId && targetCompanyId !== req.companyId) {
    sendError(res, 'FORBIDDEN', 'Access to cross-tenant organization data is prohibited', 403);
    return;
  }

  next();
}
