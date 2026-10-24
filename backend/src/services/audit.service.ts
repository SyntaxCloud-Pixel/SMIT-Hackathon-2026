import { getDbPool } from '../config/database';
import { logger } from '../utils/logger';
import { AuditLogEntry } from '@hcm-lite/shared';

// In-memory audit trail fallback when database is not connected
const inMemoryAuditLogs: AuditLogEntry[] = [];

export interface CreateAuditLogParams {
  companyId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  requestId?: string;
}

export const auditService = {
  async log(params: CreateAuditLogParams): Promise<void> {
    const pool = getDbPool();

    // Sanitize any potential secrets from before/after data
    const sanitizeData = (data: any) => {
      if (!data || typeof data !== 'object') return data;
      const clone = { ...data };
      const secretKeys = ['password', 'passwordHash', 'password_hash', 'token', 'secret'];
      for (const key of Object.keys(clone)) {
        if (secretKeys.includes(key.toLowerCase())) {
          clone[key] = '[REDACTED]';
        }
      }
      return clone;
    };

    const sanitizedBefore = sanitizeData(params.beforeData);
    const sanitizedAfter = sanitizeData(params.afterData);

    logger.info(`[AUDIT] Action: ${params.action} | Entity: ${params.entityType} (${params.entityId || 'N/A'}) by User: ${params.actorUserId || 'SYSTEM'}`);

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO audit_logs 
            (company_id, actor_user_id, action, entity_type, entity_id, before_data, after_data, request_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            params.companyId,
            params.actorUserId || null,
            params.action,
            params.entityType,
            params.entityId || null,
            sanitizedBefore ? JSON.stringify(sanitizedBefore) : null,
            sanitizedAfter ? JSON.stringify(sanitizedAfter) : null,
            params.requestId || null,
          ]
        );
        return;
      } catch (err: any) {
        logger.error('Failed to persist audit log into PostgreSQL database', { error: err.message });
      }
    }

    // Append to in-memory store
    inMemoryAuditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: params.companyId,
      actorUserId: params.actorUserId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeData: sanitizedBefore,
      afterData: sanitizedAfter,
      requestId: params.requestId,
      createdAt: new Date().toISOString(),
    });
  },

  async getLogs(companyId: string, limit = 50): Promise<AuditLogEntry[]> {
    const pool = getDbPool();
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT 
            a.id, a.company_id AS "companyId", a.actor_user_id AS "actorUserId",
            u.email AS "actorEmail", a.action, a.entity_type AS "entityType",
            a.entity_id AS "entityId", a.before_data AS "beforeData",
            a.after_data AS "afterData", a.request_id AS "requestId",
            a.created_at AS "createdAt"
           FROM audit_logs a
           LEFT JOIN users u ON a.actor_user_id = u.id
           WHERE a.company_id = $1
           ORDER BY a.created_at DESC
           LIMIT $2`,
          [companyId, limit]
        );
        return result.rows;
      } catch (err: any) {
        logger.error('Failed to query audit logs from PostgreSQL', { error: err.message });
      }
    }

    return inMemoryAuditLogs
      .filter((log) => log.companyId === companyId)
      .slice(-limit)
      .reverse();
  },
};
