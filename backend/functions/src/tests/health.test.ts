import { config } from '../config/env';

describe('Safe Health Endpoint Verification', () => {
  it('should return safe diagnostic health payload without leaking secrets', () => {
    const healthPayload = {
      status: 'ok',
      service: 'thought-catcher-backend',
      environment: config.isEmulator ? 'emulator' : 'production',
      region: config.firebaseRegion,
      firebase: 'connected',
      groq_configured: Boolean(process.env.GROQ_API_KEY || config.groqApiKey),
      groq_model: config.groqModel,
      revenuecat_configured: Boolean(config.revenueCatWebhookSecret),
      timestamp: new Date().toISOString(),
    };

    expect(healthPayload.status).toBe('ok');
    expect(healthPayload.service).toBe('thought-catcher-backend');
    expect(healthPayload.region).toBe('asia-south1');
    expect(healthPayload).not.toHaveProperty('groqApiKey');
    expect(healthPayload).not.toHaveProperty('apiKey');
    expect(healthPayload).not.toHaveProperty('revenueCatWebhookSecret');
    expect(healthPayload).not.toHaveProperty('secret');
  });
});
