import { CallableRequest } from 'firebase-functions/v2/https';
import { config } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function verifyAppCheck(request: CallableRequest<unknown>): void {
  if (!config.enforceAppCheck || config.isEmulator) {
    return;
  }

  if (!request.app) {
    logger.warn('App Check verification failed: missing or invalid token', {
      authUid: request.auth?.uid,
    });
    throw new AppError(
      'PERMISSION_DENIED',
      'The request was rejected due to an invalid or missing App Check verification token.'
    );
  }
}
