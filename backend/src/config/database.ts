import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export function getDbPool(): Pool | null {
  if (!pool && env.DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' || env.DATABASE_URL.includes('supabase')
          ? { rejectUnauthorized: false }
          : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      pool.on('error', (err) => {
        logger.error('Unexpected PostgreSQL Pool Error', err);
      });

      logger.info('PostgreSQL Pool initialized');
    } catch (err) {
      logger.error('Failed to initialize PostgreSQL pool', err);
      pool = null;
    }
  }
  return pool;
}

export async function checkDatabaseHealth(): Promise<{
  configured: boolean;
  status: 'connected' | 'disconnected' | 'unconfigured';
  error?: string;
}> {
  if (!env.DATABASE_URL) {
    return {
      configured: false,
      status: 'unconfigured',
    };
  }

  const activePool = getDbPool();
  if (!activePool) {
    return {
      configured: true,
      status: 'disconnected',
      error: 'Pool could not be created',
    };
  }

  try {
    const client = await activePool.connect();
    try {
      await client.query('SELECT 1');
      return {
        configured: true,
        status: 'connected',
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.warn('Database health check probe failed', { error: err.message });
    return {
      configured: true,
      status: 'disconnected',
      error: err.message,
    };
  }
}
