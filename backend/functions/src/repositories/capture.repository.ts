import { db } from '../config/firebase';
import { CaptureDoc, EnrichmentStatus } from '../types/capture.types';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { COLLECTIONS } from '../utils/constants';

export async function getCaptureById(captureId: string): Promise<CaptureDoc | null> {
  const doc = await db.collection(COLLECTIONS.CAPTURES).doc(captureId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as CaptureDoc;
}

export async function upsertCapture(capture: CaptureDoc): Promise<CaptureDoc> {
  const captureRef = db.collection(COLLECTIONS.CAPTURES).doc(capture.id);
  const existing = await captureRef.get();
  const now = toFirestoreTimestamp();

  if (existing.exists) {
    const existingData = existing.data() as CaptureDoc;
    const merged: CaptureDoc = {
      ...existingData,
      text: capture.text || existingData.text,
      voice_transcript_reference: capture.voice_transcript_reference || existingData.voice_transcript_reference,
      user_id: capture.user_id || existingData.user_id,
      device_id: capture.device_id || existingData.device_id,
      updated_at: now,
    };
    await captureRef.set(merged, { merge: true });
    return merged;
  }

  const newCapture: CaptureDoc = {
    id: capture.id,
    user_id: capture.user_id,
    device_id: capture.device_id || null,
    text: capture.text,
    voice_transcript_reference: capture.voice_transcript_reference || null,
    created_at: capture.created_at || now,
    updated_at: now,
    enrichment_status: capture.enrichment_status || 'pending',
    deleted_at: null,
  };

  await captureRef.set(newCapture);
  return newCapture;
}

export async function updateCaptureEnrichmentStatus(
  captureId: string,
  status: EnrichmentStatus
): Promise<void> {
  await db.collection(COLLECTIONS.CAPTURES).doc(captureId).update({
    enrichment_status: status,
    updated_at: toFirestoreTimestamp(),
  });
}

export async function getUserCaptures(
  userId: string,
  includeDeleted = false
): Promise<CaptureDoc[]> {
  let query = db.collection(COLLECTIONS.CAPTURES).where('user_id', '==', userId);
  if (!includeDeleted) {
    query = query.where('deleted_at', '==', null);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as CaptureDoc);
}

export async function getDeviceCaptures(deviceId: string): Promise<CaptureDoc[]> {
  const snapshot = await db.collection(COLLECTIONS.CAPTURES).where('device_id', '==', deviceId).get();
  return snapshot.docs.map((doc) => doc.data() as CaptureDoc);
}

export async function reassignCapturesToUser(
  captureIds: string[],
  userId: string
): Promise<number> {
  if (captureIds.length === 0) return 0;

  const batchSize = 400;
  let updatedCount = 0;

  for (let i = 0; i < captureIds.length; i += batchSize) {
    const chunk = captureIds.slice(i, i + batchSize);
    const batch = db.batch();

    for (const id of chunk) {
      const docRef = db.collection(COLLECTIONS.CAPTURES).doc(id);
      batch.update(docRef, {
        user_id: userId,
        updated_at: toFirestoreTimestamp(),
      });
      updatedCount++;
    }

    await batch.commit();
  }

  return updatedCount;
}

export async function deleteCapturesByUserId(userId: string): Promise<string[]> {
  const captures = await getUserCaptures(userId, true);
  const captureIds = captures.map((c) => c.id);

  const batchSize = 400;
  for (let i = 0; i < captureIds.length; i += batchSize) {
    const chunk = captureIds.slice(i, i + batchSize);
    const batch = db.batch();
    for (const id of chunk) {
      batch.delete(db.collection(COLLECTIONS.CAPTURES).doc(id));
    }
    await batch.commit();
  }

  return captureIds;
}
