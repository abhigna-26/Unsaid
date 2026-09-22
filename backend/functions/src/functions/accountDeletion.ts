import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { authenticateCallableUser } from '../middleware/auth.middleware';
import { verifyAppCheck } from '../middleware/appCheck.middleware';
import { requestUserAccountDeletion } from '../services/deletion.service';
import { handleFunctionError } from '../utils/errors';
import { config } from '../config/env';

export const requestAccountDeletion = onCall<Record<string, unknown>, Promise<{ success: boolean; scheduled_deletion_date: string; grace_period_days: number }>>(
  {
    region: config.firebaseRegion,
    maxInstances: 50,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: true,
  },
  async (request: CallableRequest<Record<string, unknown>>) => {
    try {
      verifyAppCheck(request);
      const authUser = await authenticateCallableUser(request);
      return await requestUserAccountDeletion(authUser.uid);
    } catch (err) {
      return handleFunctionError(err, 'requestAccountDeletion');
    }
  }
);
