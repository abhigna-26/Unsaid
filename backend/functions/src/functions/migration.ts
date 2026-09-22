import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { authenticateCallableUser } from '../middleware/auth.middleware';
import { verifyAppCheck } from '../middleware/appCheck.middleware';
import { validateInput } from '../middleware/validation.middleware';
import { MigrateDeviceCapturesSchema } from '../validation/capture.schema';
import { migrateDeviceToUser } from '../services/capture.service';
import { handleFunctionError } from '../utils/errors';
import { config } from '../config/env';

interface MigratePayload {
  device_id: string;
  capture_ids: string[];
}

export const migrateDeviceCaptures = onCall<MigratePayload, Promise<{ success: boolean; migrated_count: number; capture_ids: string[] }>>(
  {
    region: config.firebaseRegion,
    maxInstances: 50,
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  },
  async (request: CallableRequest<MigratePayload>) => {
    try {
      verifyAppCheck(request);
      const authUser = await authenticateCallableUser(request);
      const validated = validateInput(MigrateDeviceCapturesSchema, request.data);

      return await migrateDeviceToUser(
        authUser.uid,
        validated.device_id,
        validated.capture_ids
      );
    } catch (err) {
      return handleFunctionError(err, 'migrateDeviceCaptures');
    }
  }
);
