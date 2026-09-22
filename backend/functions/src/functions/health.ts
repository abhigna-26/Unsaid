import { onRequest } from 'firebase-functions/v2/https';
import { config } from '../config/env';

export const health = onRequest(
  {
    region: config.firebaseRegion,
    maxInstances: 10,
    timeoutSeconds: 10,
    memory: '128MiB',
    cors: true,
  },
  (_req, res) => {
    // Only safe diagnostic information is returned. Never return secret values or tokens.
    const groqKeyPresent = Boolean(process.env.GROQ_API_KEY || config.groqApiKey);

    res.status(200).json({
      status: 'ok',
      service: 'thought-catcher-backend',
      environment: config.isEmulator ? 'emulator' : 'production',
      region: config.firebaseRegion,
      firebase: 'connected',
      groq_configured: groqKeyPresent,
      groq_model: config.groqModel,
      revenuecat_configured: Boolean(config.revenueCatWebhookSecret),
      timestamp: new Date().toISOString(),
    });
  }
);
