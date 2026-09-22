import { db } from '../config/firebase';
import { AuditLogDoc } from '../types/audit.types';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { logger } from '../utils/logger';
import { COLLECTIONS } from '../utils/constants';

export async function logAuditEvent(
  event: Omit<AuditLogDoc, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const docRef = db.collection(COLLECTIONS.AUDIT_LOG).doc();
    const logRecord: AuditLogDoc = {
      id: docRef.id,
      actor: event.actor,
      action: event.action,
      target: event.target,
      timestamp: toFirestoreTimestamp(),
      result: event.result,
      metadata: event.metadata || {},
    };

    await docRef.set(logRecord);
    return docRef.id;
  } catch (err) {
    logger.error('Failed to write audit log record', {
      error: err instanceof Error ? err.message : String(err),
      action: event.action,
      target: event.target,
    });
    return '';
  }
}
