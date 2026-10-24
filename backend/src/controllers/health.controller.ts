import { Request, Response } from 'express';
import { HealthCheckData } from '@hcm-lite/shared';
import { checkDatabaseHealth } from '../config/database';
import { env } from '../config/env';
import { sendSuccess } from '../utils/response';

const startTime = Date.now();

export async function getHealthStatus(req: Request, res: Response): Promise<void> {
  const dbHealth = await checkDatabaseHealth();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const isDegraded = dbHealth.configured && dbHealth.status !== 'connected';
  const overallStatus = isDegraded ? 'degraded' : 'healthy';

  const healthData: HealthCheckData = {
    service: 'HCM Lite API',
    status: overallStatus,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV,
    database: {
      configured: dbHealth.configured,
      status: dbHealth.status,
    },
  };

  sendSuccess(res, healthData, 'HCM Lite API is operational');
}
