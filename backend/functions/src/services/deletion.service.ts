import { auth } from '../config/firebase';
import { markUserDeletionPending, findPendingDeletions, deleteUserDoc } from '../repositories/user.repository';
import { deleteCapturesByUserId } from '../repositories/capture.repository';
import { deleteEnrichmentsByCaptureIds } from '../repositories/enrichment.repository';
import { deleteUsage } from '../repositories/usage.repository';
import { deleteEntitlement } from '../repositories/entitlement.repository';
import { logAuditEvent } from '../repositories/audit.repository';
import { logger } from '../utils/logger';

export async function requestUserAccountDeletion(uid: string): Promise<{ success: boolean; scheduled_deletion_date: string; grace_period_days: number }> {
  const { scheduledDeletionDate } = await markUserDeletionPending(uid, 7);

  await logAuditEvent({
    actor: 'user',
    action: 'account_deletion_requested',
    target: uid,
    result: 'success',
    metadata: {
      scheduledDeletionDate: scheduledDeletionDate.toISOString(),
      gracePeriodDays: 7,
    },
  });

  logger.info(`User ${uid} requested account deletion. Scheduled for ${scheduledDeletionDate.toISOString()}`);

  return {
    success: true,
    scheduled_deletion_date: scheduledDeletionDate.toISOString(),
    grace_period_days: 7,
  };
}

export async function hardDeleteUserData(uid: string): Promise<void> {
  logger.info(`Starting hard deletion cascade for user ${uid}`);

  const deletedCaptureIds = await deleteCapturesByUserId(uid);

  if (deletedCaptureIds.length > 0) {
    await deleteEnrichmentsByCaptureIds(deletedCaptureIds);
  }

  await deleteUsage(uid);
  await deleteEntitlement(uid);
  await deleteUserDoc(uid);

  try {
    await auth.deleteUser(uid);
    logger.info(`Firebase Auth record deleted for user ${uid}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('user-not-found') || (err as { code?: string }).code === 'auth/user-not-found') {
      logger.info(`Firebase Auth record already deleted for user ${uid}`);
    } else {
      logger.warn(`Could not delete Firebase Auth user ${uid}: ${errorMsg}`);
    }
  }

  await logAuditEvent({
    actor: 'system',
    action: 'account_hard_deleted',
    target: uid,
    result: 'success',
    metadata: {
      deletedCaptureCount: deletedCaptureIds.length,
    },
  });

  logger.info(`Hard deletion completed successfully for user ${uid}`);
}

export async function processScheduledHardDeletions(): Promise<{ processedCount: number }> {
  const now = new Date();
  logger.info(`Running scheduled hard deletion check at ${now.toISOString()}`);

  const pendingUsers = await findPendingDeletions(now);
  logger.info(`Found ${pendingUsers.length} accounts pending hard deletion`);

  let count = 0;
  for (const user of pendingUsers) {
    try {
      await hardDeleteUserData(user.uid);
      count++;
    } catch (err) {
      logger.error(`Failed hard deletion for user ${user.uid}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { processedCount: count };
}
