import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { authenticateCallableUser } from '../middleware/auth.middleware';
import { verifyAppCheck } from '../middleware/appCheck.middleware';
import { generateUserDataExport, UserDataExportBundle } from '../services/export.service';
import { handleFunctionError } from '../utils/errors';
import { config } from '../config/env';

export const exportUserData = onCall<Record<string, unknown>, Promise<UserDataExportBundle>>(
  {
    region: config.firebaseRegion,
    maxInstances: 20,
    timeoutSeconds: 60,
    memory: '512MiB',
    cors: true,
  },
  async (request: CallableRequest<Record<string, unknown>>): Promise<UserDataExportBundle> => {
    try {
      verifyAppCheck(request);
      const authUser = await authenticateCallableUser(request);
      return await generateUserDataExport(authUser.uid);
    } catch (err) {
      return handleFunctionError(err, 'exportUserData');
    }
  }
);
