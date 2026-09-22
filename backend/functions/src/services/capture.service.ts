import { associateDeviceWithUser } from '../repositories/user.repository';
import { linkDeviceToUser } from '../repositories/device.repository';
import { reassignCapturesToUser } from '../repositories/capture.repository';
import { logAuditEvent } from '../repositories/audit.repository';
import { logger } from '../utils/logger';

export async function migrateDeviceToUser(
  userId: string,
  deviceId: string,
  captureIds: string[]
): Promise<{ success: boolean; migrated_count: number; capture_ids: string[] }> {
  logger.info(`Migrating ${captureIds.length} captures from device ${deviceId} to user ${userId}`);

  await Promise.all([
    associateDeviceWithUser(userId, deviceId),
    linkDeviceToUser(deviceId, userId),
  ]);

  const migratedCount = await reassignCapturesToUser(captureIds, userId);

  await logAuditEvent({
    actor: 'user',
    action: 'device_migrated',
    target: userId,
    result: 'success',
    metadata: {
      deviceId,
      migratedCaptureCount: migratedCount,
    },
  });

  logger.info(`Successfully migrated ${migratedCount} captures to user ${userId}`);

  return {
    success: true,
    migrated_count: migratedCount,
    capture_ids: captureIds,
  };
}
