import { db } from '../config/firebase';
import { ProcessedEventDoc } from '../types/audit.types';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { COLLECTIONS } from '../utils/constants';

export async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const doc = await db.collection(COLLECTIONS.PROCESSED_EVENTS).doc(eventId).get();
  return doc.exists;
}

export async function recordProcessedEvent(
  eventId: string,
  eventType: string,
  result: 'success' | 'ignored_duplicate' | 'error',
  errorMessage?: string | null
): Promise<void> {
  const now = toFirestoreTimestamp();
  const eventDoc: ProcessedEventDoc = {
    event_id: eventId,
    event_type: eventType,
    received_at: now,
    processed_at: now,
    result,
    error_message: errorMessage || null,
  };

  await db.collection(COLLECTIONS.PROCESSED_EVENTS).doc(eventId).set(eventDoc, { merge: true });
}
