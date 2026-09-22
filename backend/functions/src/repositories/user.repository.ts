import { db } from '../config/firebase';
import { UserDoc, UserPlan } from '../types/user.types';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { COLLECTIONS } from '../utils/constants';
import { FieldValue } from 'firebase-admin/firestore';

export async function getUser(uid: string): Promise<UserDoc | null> {
  const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as UserDoc;
}

export async function createUserIfNotExists(
  uid: string,
  initialData: Partial<UserDoc> = {}
): Promise<UserDoc> {
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const existing = await userRef.get();

  if (existing.exists) {
    return existing.data() as UserDoc;
  }

  const now = toFirestoreTimestamp();
  const newUser: UserDoc = {
    uid,
    email: initialData.email || null,
    display_name: initialData.display_name || null,
    photo_url: initialData.photo_url || null,
    plan: 'free',
    device_ids: initialData.device_ids || [],
    revenuecat_customer_id: null,
    created_at: now,
    updated_at: now,
    account_status: 'active',
    deleted_at: null,
    deletion_scheduled_for: null,
  };

  await userRef.set(newUser);
  return newUser;
}

export async function updateUserPlan(
  uid: string,
  plan: UserPlan,
  revenuecatCustomerId?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    plan,
    updated_at: toFirestoreTimestamp(),
  };

  if (revenuecatCustomerId) {
    updateData.revenuecat_customer_id = revenuecatCustomerId;
  }

  await db.collection(COLLECTIONS.USERS).doc(uid).set(updateData, { merge: true });
}

export async function markUserDeletionPending(
  uid: string,
  gracePeriodDays = 7
): Promise<{ scheduledDeletionDate: Date }> {
  const now = new Date();
  const scheduledDate = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  await db.collection(COLLECTIONS.USERS).doc(uid).update({
    account_status: 'deletion_pending',
    deleted_at: toFirestoreTimestamp(now),
    deletion_scheduled_for: toFirestoreTimestamp(scheduledDate),
    updated_at: toFirestoreTimestamp(now),
  });

  return { scheduledDeletionDate: scheduledDate };
}

export async function findPendingDeletions(beforeDate: Date = new Date()): Promise<UserDoc[]> {
  const cutoffTimestamp = toFirestoreTimestamp(beforeDate);
  const snapshot = await db
    .collection(COLLECTIONS.USERS)
    .where('account_status', '==', 'deletion_pending')
    .where('deletion_scheduled_for', '<=', cutoffTimestamp)
    .get();

  return snapshot.docs.map((doc) => doc.data() as UserDoc);
}

export async function deleteUserDoc(uid: string): Promise<void> {
  await db.collection(COLLECTIONS.USERS).doc(uid).delete();
}

export async function associateDeviceWithUser(uid: string, deviceId: string): Promise<void> {
  await db.collection(COLLECTIONS.USERS).doc(uid).set(
    {
      device_ids: FieldValue.arrayUnion(deviceId),
      updated_at: toFirestoreTimestamp(),
    },
    { merge: true }
  );
}
