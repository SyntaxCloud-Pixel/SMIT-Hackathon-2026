type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info(message: string, meta?: any) {
    console.log(
      `[${new Date().toISOString()}] [INFO] ${message}`,
      meta ? JSON.stringify(sanitize(meta)) : ''
    );
  },
  warn(message: string, meta?: any) {
    console.warn(
      `[${new Date().toISOString()}] [WARN] ${message}`,
      meta ? JSON.stringify(sanitize(meta)) : ''
    );
  },
  error(message: string, error?: any) {
    console.error(
      `[${new Date().toISOString()}] [ERROR] ${message}`,
      error?.stack || (error ? JSON.stringify(sanitize(error)) : '')
    );
  },
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `[${new Date().toISOString()}] [DEBUG] ${message}`,
        meta ? JSON.stringify(sanitize(meta)) : ''
      );
    }
  },
};
