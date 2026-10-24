import { Response } from 'express';
import { ApiResponse } from '@hcm-lite/shared';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: any
): Response {
  const payload: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}
