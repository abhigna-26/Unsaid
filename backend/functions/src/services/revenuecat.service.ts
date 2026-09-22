import { config } from '../config/env';
import { RevenueCatWebhookBody } from '../types/revenuecat.types';
import { EntitlementStatus } from '../types/entitlement.types';
import { UserPlan } from '../types/user.types';
import { isEventAlreadyProcessed, recordProcessedEvent } from '../repositories/processedEvent.repository';
import { upsertEntitlement } from '../repositories/entitlement.repository';
import { updateUserPlan } from '../repositories/user.repository';
import { logAuditEvent } from '../repositories/audit.repository';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { toFirestoreTimestamp } from '../utils/timestamps';

export function verifyRevenueCatWebhookAuth(authHeader: string | undefined): boolean {
  if (!config.revenueCatWebhookSecret) {
    logger.warn('REVENUECAT_WEBHOOK_SECRET is not configured. Webhook rejected.');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  return token === config.revenueCatWebhookSecret;
}

export async function processRevenueCatWebhook(body: RevenueCatWebhookBody): Promise<{ result: string; message: string }> {
  const event = body.event;
  if (!event || !event.id) {
    throw new AppError('INVALID_ARGUMENT', 'Invalid webhook payload: missing event or event ID.');
  }

  const eventId = event.id;
  const eventType = event.type;
  const appUserId = event.app_user_id;

  const alreadyProcessed = await isEventAlreadyProcessed(eventId);
  if (alreadyProcessed) {
    logger.info(`Duplicate RevenueCat webhook event ${eventId} received. Skipping processing.`);
    return { result: 'ignored_duplicate', message: 'Event already processed.' };
  }

  try {
    let targetPlan: UserPlan = 'free';
    let entitlementStatus: EntitlementStatus = 'expired';

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        targetPlan = 'pro';
        entitlementStatus = 'active';
        break;

      case 'BILLING_ISSUE':
        targetPlan = 'pro';
        entitlementStatus = event.grace_period_expiration_at_ms ? 'in_grace_period' : 'in_billing_retry';
        break;

      case 'EXPIRATION':
        targetPlan = 'free';
        entitlementStatus = 'expired';
        break;

      case 'CANCELLATION':
        if (event.expiration_at_ms && event.expiration_at_ms > Date.now()) {
          targetPlan = 'pro';
          entitlementStatus = 'active';
        } else {
          targetPlan = 'free';
          entitlementStatus = 'expired';
        }
        break;

      case 'PRODUCT_CHANGE':
        targetPlan = 'pro';
        entitlementStatus = 'active';
        break;

      case 'TRANSFER':
      case 'SUBSCRIBER_ALIAS':
      case 'SUBSCRIPTION_PAUSED':
      default:
        logger.info(`Received informational RevenueCat event ${eventType} for user ${appUserId}`);
        break;
    }

    const expiresAt = event.expiration_at_ms ? toFirestoreTimestamp(new Date(event.expiration_at_ms)) : null;
    const entitlementId = event.entitlement_id || (event.entitlement_ids && event.entitlement_ids[0]) || 'pro';

    await upsertEntitlement(appUserId, {
      uid: appUserId,
      plan: targetPlan,
      status: entitlementStatus,
      revenuecat_customer_id: event.original_app_user_id || appUserId,
      entitlement_id: entitlementId,
      product_id: event.product_id,
      expires_at: expiresAt,
    });

    await updateUserPlan(appUserId, targetPlan, event.original_app_user_id || appUserId);

    await logAuditEvent({
      actor: 'revenuecat_webhook',
      action: targetPlan === 'pro' ? 'entitlement_updated' : 'entitlement_revoked',
      target: appUserId,
      result: 'success',
      metadata: {
        eventId,
        eventType,
        productId: event.product_id,
        status: entitlementStatus,
        plan: targetPlan,
      },
    });

    await recordProcessedEvent(eventId, eventType, 'success');

    logger.info(`Successfully processed RevenueCat event ${eventType} for user ${appUserId}`, {
      eventId,
      plan: targetPlan,
      status: entitlementStatus,
    });

    return { result: 'success', message: 'Webhook processed successfully.' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Error processing RevenueCat event ${eventId}`, { error: errorMsg });
    await recordProcessedEvent(eventId, eventType, 'error', errorMsg);
    throw err;
  }
}
