import { db } from '../config/firebase';
import { DeviceDoc } from '../types/device.types';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { COLLECTIONS } from '../utils/constants';

export async function getDevice(deviceId: string): Promise<DeviceDoc | null> {
  const doc = await db.collection(COLLECTIONS.DEVICES).doc(deviceId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as DeviceDoc;
}

export async function upsertDevice(
  deviceId: string,
  data: Partial<DeviceDoc> = {}
): Promise<DeviceDoc> {
  const deviceRef = db.collection(COLLECTIONS.DEVICES).doc(deviceId);
  const existing = await deviceRef.get();
  const now = toFirestoreTimestamp();

  if (existing.exists) {
    const existingData = existing.data() as DeviceDoc;
    const updatedData: Partial<DeviceDoc> = {
      ...data,
      last_seen_at: now,
    };
    await deviceRef.set(updatedData, { merge: true });
    return { ...existingData, ...updatedData } as DeviceDoc;
  }

  const newDevice: DeviceDoc = {
    device_id: deviceId,
    created_at: now,
    last_seen_at: now,
    user_id: data.user_id || null,
    daily_enrichment_count: data.daily_enrichment_count || 0,
    weekly_enrichment_count: data.weekly_enrichment_count || 0,
    daily_reset_at: data.daily_reset_at || now,
    weekly_reset_at: data.weekly_reset_at || now,
    app_check_verified: data.app_check_verified ?? false,
  };

  await deviceRef.set(newDevice);
  return newDevice;
}

export async function linkDeviceToUser(deviceId: string, uid: string): Promise<void> {
  await db.collection(COLLECTIONS.DEVICES).doc(deviceId).set(
    {
      user_id: uid,
      last_seen_at: toFirestoreTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await db.collection(COLLECTIONS.DEVICES).doc(deviceId).delete();
}
