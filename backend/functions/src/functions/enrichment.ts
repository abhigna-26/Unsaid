import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { authenticateCallableUser } from '../middleware/auth.middleware';
import { verifyAppCheck } from '../middleware/appCheck.middleware';
import { validateInput } from '../middleware/validation.middleware';
import { RequestEnrichmentSchema } from '../validation/enrichment.schema';
import { processEnrichmentRequest, ProcessEnrichmentResult } from '../services/enrichment.service';
import { handleFunctionError } from '../utils/errors';
import { config } from '../config/env';

export const groqApiKeySecret = defineSecret('GROQ_API_KEY');

interface RequestEnrichmentPayload {
  capture_id: string;
  force_retry?: boolean;
}

export const requestEnrichment = onCall<RequestEnrichmentPayload, Promise<ProcessEnrichmentResult>>(
  {
    region: config.firebaseRegion,
    secrets: [groqApiKeySecret],
    maxInstances: 100,
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  },
  async (request: CallableRequest<RequestEnrichmentPayload>): Promise<ProcessEnrichmentResult> => {
    try {
      verifyAppCheck(request);
      const authUser = await authenticateCallableUser(request);
      const validated = validateInput(RequestEnrichmentSchema, request.data);

      return await processEnrichmentRequest(
        authUser.uid,
        validated.capture_id,
        validated.force_retry ?? false
      );
    } catch (err) {
      return handleFunctionError(err, 'requestEnrichment');
    }
  }
);
