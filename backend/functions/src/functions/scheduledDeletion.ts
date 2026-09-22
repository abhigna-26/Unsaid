import { onSchedule } from 'firebase-functions/v2/scheduler';
import { processScheduledHardDeletions } from '../services/deletion.service';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const scheduledHardDeletion = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'UTC',
    region: config.firebaseRegion,
    retryCount: 3,
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    logger.info('Executing scheduled hard deletion worker');
    const result = await processScheduledHardDeletions();
    logger.info(`Scheduled hard deletion finished. Processed: ${result.processedCount}`);
  }
);
