import { HttpsError, FunctionsErrorCode } from 'firebase-functions/v2/https';
import { logger } from './logger';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'INVALID_ARGUMENT'
  | 'RESOURCE_NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'AI_SERVICE_ERROR'
  | 'INTERNAL_ERROR'
  | 'ACCOUNT_DELETION_PENDING'
  | 'RATE_LIMITED';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;

    switch (code) {
      case 'UNAUTHENTICATED':
        this.statusCode = 401;
        break;
      case 'PERMISSION_DENIED':
      case 'ACCOUNT_DELETION_PENDING':
        this.statusCode = 403;
        break;
      case 'RESOURCE_NOT_FOUND':
        this.statusCode = 404;
        break;
      case 'INVALID_ARGUMENT':
        this.statusCode = 400;
        break;
      case 'QUOTA_EXCEEDED':
      case 'RATE_LIMITED':
        this.statusCode = 429;
        break;
      case 'AI_SERVICE_ERROR':
        this.statusCode = 502;
        break;
      case 'INTERNAL_ERROR':
      default:
        this.statusCode = 500;
        break;
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function mapToHttpsErrorCode(code: ErrorCode): FunctionsErrorCode {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'unauthenticated';
    case 'PERMISSION_DENIED':
    case 'ACCOUNT_DELETION_PENDING':
      return 'permission-denied';
    case 'RESOURCE_NOT_FOUND':
      return 'not-found';
    case 'INVALID_ARGUMENT':
      return 'invalid-argument';
    case 'QUOTA_EXCEEDED':
    case 'RATE_LIMITED':
      return 'resource-exhausted';
    case 'AI_SERVICE_ERROR':
      return 'unavailable';
    case 'INTERNAL_ERROR':
    default:
      return 'internal';
  }
}

export function handleFunctionError(err: unknown, contextName: string): never {
  if (err instanceof AppError) {
    logger.warn(`[${contextName}] Expected error: ${err.code} - ${err.message}`, {
      code: err.code,
      details: err.details,
    });
    throw new HttpsError(mapToHttpsErrorCode(err.code), err.message, {
      code: err.code,
      details: err.details,
    });
  }

  if (err instanceof HttpsError) {
    logger.warn(`[${contextName}] HttpsError: ${err.code} - ${err.message}`);
    throw err;
  }

  logger.error(`[${contextName}] Unhandled internal error`, {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  throw new HttpsError('internal', 'An internal server error occurred. Please try again later.', {
    code: 'INTERNAL_ERROR',
  });
}
