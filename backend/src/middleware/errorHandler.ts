import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal server error occurred';

  logger.error(`[${req.method}] ${req.url} Error: ${message}`, {
    statusCode,
    code: errorCode,
    stack: err.stack,
  });

  sendError(
    res,
    errorCode,
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please contact system administrator.'
      : message,
    statusCode,
    process.env.NODE_ENV !== 'production' ? err.details : undefined
  );
}
