import { onRequest } from 'firebase-functions/v2/https';
import { verifyRevenueCatWebhookAuth, processRevenueCatWebhook } from '../services/revenuecat.service';
import { RevenueCatWebhookBody } from '../types/revenuecat.types';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export const revenueCatWebhook = onRequest(
  {
    region: config.firebaseRegion,
    maxInstances: 20,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: false,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Only POST is accepted.' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!verifyRevenueCatWebhookAuth(authHeader)) {
      logger.warn('Unauthorized RevenueCat webhook attempt rejected');
      res.status(401).json({ error: 'Unauthorized webhook request.' });
      return;
    }

    try {
      const body = req.body as RevenueCatWebhookBody;
      const result = await processRevenueCatWebhook(body);
      res.status(200).json(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Internal webhook processing error';
      logger.error('RevenueCat webhook processing error', { error: errorMsg });
      res.status(500).json({ error: 'Failed to process webhook event.' });
    }
  }
);
