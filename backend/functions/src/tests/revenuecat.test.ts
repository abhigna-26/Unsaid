import { processRevenueCatWebhook, verifyRevenueCatWebhookAuth } from '../services/revenuecat.service';
import * as eventsRepo from '../repositories/processedEvent.repository';
import * as entitlementsRepo from '../repositories/entitlement.repository';
import * as usersRepo from '../repositories/user.repository';
import * as auditRepo from '../repositories/audit.repository';
import { RevenueCatWebhookBody } from '../types/revenuecat.types';

jest.mock('../repositories/processedEvent.repository');
jest.mock('../repositories/entitlement.repository');
jest.mock('../repositories/user.repository');
jest.mock('../repositories/audit.repository');
jest.mock('../config/env', () => ({
  config: {
    revenueCatWebhookSecret: 'valid_secret_123',
    firebaseRegion: 'asia-south1',
    isEmulator: true,
  },
}));

describe('RevenueCat Webhook Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (eventsRepo.isEventAlreadyProcessed as jest.Mock).mockResolvedValue(false);
    (eventsRepo.recordProcessedEvent as jest.Mock).mockResolvedValue(undefined);
    (entitlementsRepo.upsertEntitlement as jest.Mock).mockResolvedValue({});
    (usersRepo.updateUserPlan as jest.Mock).mockResolvedValue(undefined);
    (auditRepo.logAuditEvent as jest.Mock).mockResolvedValue('audit_123');
  });

  it('should validate webhook bearer token', () => {
    expect(verifyRevenueCatWebhookAuth('Bearer valid_secret_123')).toBe(true);
    expect(verifyRevenueCatWebhookAuth('Bearer wrong_secret')).toBe(false);
    expect(verifyRevenueCatWebhookAuth(undefined)).toBe(false);
  });

  it('should process INITIAL_PURCHASE and grant Pro plan', async () => {
    const payload: RevenueCatWebhookBody = {
      event: {
        id: 'evt_initial_123',
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user_pro_1',
        product_id: 'thoughtcatcher_pro_monthly',
        entitlement_id: 'pro',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
    };

    const response = await processRevenueCatWebhook(payload);
    expect(response.result).toBe('success');
    expect(usersRepo.updateUserPlan).toHaveBeenCalledWith('user_pro_1', 'pro', 'user_pro_1');
    expect(entitlementsRepo.upsertEntitlement).toHaveBeenCalledWith(
      'user_pro_1',
      expect.objectContaining({
        plan: 'pro',
        status: 'active',
      })
    );
    expect(eventsRepo.recordProcessedEvent).toHaveBeenCalledWith('evt_initial_123', 'INITIAL_PURCHASE', 'success');
  });

  it('should ignore duplicate events idempotently', async () => {
    (eventsRepo.isEventAlreadyProcessed as jest.Mock).mockResolvedValueOnce(true);

    const payload: RevenueCatWebhookBody = {
      event: {
        id: 'evt_duplicate_456',
        type: 'RENEWAL',
        app_user_id: 'user_pro_1',
        product_id: 'thoughtcatcher_pro_monthly',
      },
    };

    const response = await processRevenueCatWebhook(payload);
    expect(response.result).toBe('ignored_duplicate');
    expect(usersRepo.updateUserPlan).not.toHaveBeenCalled();
  });

  it('should downgrade user to free on EXPIRATION', async () => {
    const payload: RevenueCatWebhookBody = {
      event: {
        id: 'evt_expire_789',
        type: 'EXPIRATION',
        app_user_id: 'user_expired_1',
        product_id: 'thoughtcatcher_pro_monthly',
      },
    };

    const response = await processRevenueCatWebhook(payload);
    expect(response.result).toBe('success');
    expect(usersRepo.updateUserPlan).toHaveBeenCalledWith('user_expired_1', 'free', 'user_expired_1');
    expect(entitlementsRepo.upsertEntitlement).toHaveBeenCalledWith(
      'user_expired_1',
      expect.objectContaining({
        plan: 'free',
        status: 'expired',
      })
    );
  });
});
