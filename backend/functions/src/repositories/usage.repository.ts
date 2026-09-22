import { db } from '../config/firebase';
import { UsageDoc } from '../types/usage.types';
import {
  getNextUTCDayStart,
  getNextUTCWeekStart,
  hasTimestampPassed,
  toFirestoreTimestamp,
  normalizeDate,
} from '../utils/timestamps';
import { AppError } from '../utils/errors';
import { COLLECTIONS } from '../utils/constants';

export async function getUsage(ownerId: string): Promise<UsageDoc | null> {
  const doc = await db.collection(COLLECTIONS.USAGE).doc(ownerId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as UsageDoc;
}

export async function checkAndIncrementUsageAtomic(
  ownerId: string,
  isPro: boolean,
  maxDaily: number,
  maxWeekly: number
): Promise<{ dailyCount: number; weeklyCount: number; isPro: boolean }> {
  const docRef = db.collection(COLLECTIONS.USAGE).doc(ownerId);

  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const now = new Date();

    let dailyCount = 0;
    let weeklyCount = 0;
    let nextDailyReset = getNextUTCDayStart(now);
    let nextWeeklyReset = getNextUTCWeekStart(now);

    if (snapshot.exists) {
      const data = snapshot.data() as UsageDoc;

      if (hasTimestampPassed(data.daily_reset_at, now)) {
        dailyCount = 0;
        nextDailyReset = getNextUTCDayStart(now);
      } else {
        dailyCount = data.daily_enrichments || 0;
        nextDailyReset = data.daily_reset_at ? normalizeDate(data.daily_reset_at) : getNextUTCDayStart(now);
      }

      if (hasTimestampPassed(data.weekly_reset_at, now)) {
        weeklyCount = 0;
        nextWeeklyReset = getNextUTCWeekStart(now);
      } else {
        weeklyCount = data.weekly_enrichments || 0;
        nextWeeklyReset = data.weekly_reset_at ? normalizeDate(data.weekly_reset_at) : getNextUTCWeekStart(now);
      }
    }

    if (!isPro) {
      if (dailyCount >= maxDaily) {
        throw new AppError(
          'QUOTA_EXCEEDED',
          `Daily enrichment quota reached (${dailyCount}/${maxDaily}). Upgrade to Pro for unlimited enrichments or try again tomorrow at 00:00 UTC.`,
          {
            quotaType: 'daily',
            current: dailyCount,
            limit: maxDaily,
            resetsAt: nextDailyReset.toISOString(),
          }
        );
      }

      if (weeklyCount >= maxWeekly) {
        throw new AppError(
          'QUOTA_EXCEEDED',
          `Weekly enrichment quota reached (${weeklyCount}/${maxWeekly}). Upgrade to Pro for unlimited enrichments or try again next Monday at 00:00 UTC.`,
          {
            quotaType: 'weekly',
            current: weeklyCount,
            limit: maxWeekly,
            resetsAt: nextWeeklyReset.toISOString(),
          }
        );
      }
    }

    const newDaily = dailyCount + 1;
    const newWeekly = weeklyCount + 1;

    transaction.set(
      docRef,
      {
        owner_id: ownerId,
        daily_enrichments: newDaily,
        weekly_enrichments: newWeekly,
        daily_reset_at: toFirestoreTimestamp(nextDailyReset),
        weekly_reset_at: toFirestoreTimestamp(nextWeeklyReset),
        updated_at: toFirestoreTimestamp(now),
      },
      { merge: true }
    );

    return {
      dailyCount: newDaily,
      weeklyCount: newWeekly,
      isPro,
    };
  });
}

export async function refundUsageAtomic(ownerId: string): Promise<void> {
  const docRef = db.collection(COLLECTIONS.USAGE).doc(ownerId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) return;

    const data = snapshot.data() as UsageDoc;
    const newDaily = Math.max(0, (data.daily_enrichments || 1) - 1);
    const newWeekly = Math.max(0, (data.weekly_enrichments || 1) - 1);

    transaction.update(docRef, {
      daily_enrichments: newDaily,
      weekly_enrichments: newWeekly,
      updated_at: toFirestoreTimestamp(),
    });
  });
}

export async function deleteUsage(ownerId: string): Promise<void> {
  await db.collection(COLLECTIONS.USAGE).doc(ownerId).delete();
}
