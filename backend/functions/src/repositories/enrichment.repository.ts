import { db } from '../config/firebase';
import { EnrichmentDoc } from '../types/enrichment.types';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { COLLECTIONS } from '../utils/constants';

export async function getEnrichmentByCaptureId(captureId: string): Promise<EnrichmentDoc | null> {
  const doc = await db.collection(COLLECTIONS.ENRICHMENTS).doc(captureId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as EnrichmentDoc;
}

export async function saveEnrichment(enrichment: EnrichmentDoc): Promise<void> {
  const docRef = db.collection(COLLECTIONS.ENRICHMENTS).doc(enrichment.capture_id);
  const now = toFirestoreTimestamp();

  await docRef.set(
    {
      ...enrichment,
      updated_at: now,
    },
    { merge: true }
  );
}

export async function getEnrichmentsForCaptures(captureIds: string[]): Promise<EnrichmentDoc[]> {
  if (captureIds.length === 0) return [];

  const results: EnrichmentDoc[] = [];
  const chunkSize = 30;

  for (let i = 0; i < captureIds.length; i += chunkSize) {
    const chunk = captureIds.slice(i, i + chunkSize);
    const snapshot = await db
      .collection(COLLECTIONS.ENRICHMENTS)
      .where('capture_id', 'in', chunk)
      .get();

    for (const doc of snapshot.docs) {
      results.push(doc.data() as EnrichmentDoc);
    }
  }

  return results;
}

export async function deleteEnrichmentsByCaptureIds(captureIds: string[]): Promise<void> {
  if (captureIds.length === 0) return;

  const batchSize = 400;
  for (let i = 0; i < captureIds.length; i += batchSize) {
    const chunk = captureIds.slice(i, i + batchSize);
    const batch = db.batch();
    for (const id of chunk) {
      batch.delete(db.collection(COLLECTIONS.ENRICHMENTS).doc(id));
    }
    await batch.commit();
  }
}
