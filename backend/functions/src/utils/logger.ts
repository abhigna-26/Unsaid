import * as functionsLogger from 'firebase-functions/logger';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'groq_api_key',
  'groqapikey',
  'api_key',
  'apikey',
  'secret',
  'webhook_secret',
  'revenuecat_webhook_secret',
  'password',
  'token',
  'text',
  'raw_text',
  'transcript',
]);

function sanitizeMetadata(obj: unknown, depth = 0): unknown {
  if (depth > 5) return '[Truncated]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('Bearer ') || obj.startsWith('gsk_') || obj.length > 256) {
      return '[REDACTED_OR_TRUNCATED]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = k.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        clean[k] = '[REDACTED_FOR_PRIVACY]';
      } else {
        clean[k] = sanitizeMetadata(v, depth + 1);
      }
    }
    return clean;
  }

  return obj;
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    functionsLogger.info(message, sanitizeMetadata(meta) as Record<string, unknown>);
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    functionsLogger.warn(message, sanitizeMetadata(meta) as Record<string, unknown>);
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    functionsLogger.error(message, sanitizeMetadata(meta) as Record<string, unknown>);
  },
  debug: (message: string, meta?: Record<string, unknown>): void => {
    functionsLogger.debug(message, sanitizeMetadata(meta) as Record<string, unknown>);
  },
};
