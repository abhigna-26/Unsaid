import { getUser } from '../repositories/user.repository';
import { getEntitlement } from '../repositories/entitlement.repository';
import { getUsage } from '../repositories/usage.repository';
import { getUserCaptures } from '../repositories/capture.repository';
import { getEnrichmentsForCaptures } from '../repositories/enrichment.repository';
import { logger } from '../utils/logger';
import { UserDoc } from '../types/user.types';
import { EntitlementDoc } from '../types/entitlement.types';
import { UsageDoc } from '../types/usage.types';
import { CaptureDoc } from '../types/capture.types';
import { EnrichmentDoc } from '../types/enrichment.types';

export interface UserDataExportBundle {
  user: UserDoc | null;
  entitlement: EntitlementDoc | null;
  usage: UsageDoc | null;
  captures: CaptureDoc[];
  enrichments: EnrichmentDoc[];
  exported_at: string;
}

export async function generateUserDataExport(uid: string): Promise<UserDataExportBundle> {
  logger.info(`Generating data export for user ${uid}`);

  const [user, entitlement, usage, captures] = await Promise.all([
    getUser(uid),
    getEntitlement(uid),
    getUsage(uid),
    getUserCaptures(uid, false),
  ]);

  const captureIds = captures.map((c) => c.id);
  const enrichments = await getEnrichmentsForCaptures(captureIds);

  return {
    user,
    entitlement,
    usage,
    captures,
    enrichments,
    exported_at: new Date().toISOString(),
  };
}
