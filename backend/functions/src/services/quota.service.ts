import { config } from '../config/env';
import { getEntitlement } from '../repositories/entitlement.repository';
import { checkAndIncrementUsageAtomic, refundUsageAtomic } from '../repositories/usage.repository';
import { getUser } from '../repositories/user.repository';

export interface QuotaReservationResult {
  isPro: boolean;
  dailyCount: number;
  weeklyCount: number;
}

export async function isUserPro(uid: string): Promise<boolean> {
  const entitlement = await getEntitlement(uid);
  if (entitlement && (entitlement.status === 'active' || entitlement.status === 'in_grace_period')) {
    return entitlement.plan === 'pro';
  }

  const user = await getUser(uid);
  return user?.plan === 'pro';
}

export async function reserveEnrichmentQuota(
  ownerId: string,
  isAnonymous = false
): Promise<QuotaReservationResult> {
  const isPro = isAnonymous ? false : await isUserPro(ownerId);

  const result = await checkAndIncrementUsageAtomic(
    ownerId,
    isPro,
    config.freeTierDailyLimit,
    config.freeTierWeeklyLimit
  );

  return {
    isPro,
    dailyCount: result.dailyCount,
    weeklyCount: result.weeklyCount,
  };
}

export async function refundEnrichmentQuota(ownerId: string): Promise<void> {
  await refundUsageAtomic(ownerId);
}
