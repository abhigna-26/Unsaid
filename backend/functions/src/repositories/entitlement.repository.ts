import { db } from '../config/firebase';
import { EntitlementDoc } from '../types/entitlement.types';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { COLLECTIONS } from '../utils/constants';

export async function getEntitlement(uid: string): Promise<EntitlementDoc | null> {
  const doc = await db.collection(COLLECTIONS.ENTITLEMENTS).doc(uid).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as EntitlementDoc;
}

export async function upsertEntitlement(
  uid: string,
  data: Partial<EntitlementDoc>
): Promise<EntitlementDoc> {
  const docRef = db.collection(COLLECTIONS.ENTITLEMENTS).doc(uid);
  const now = toFirestoreTimestamp();

  const entitlement: EntitlementDoc = {
    uid,
    plan: data.plan || 'free',
    status: data.status || 'expired',
    revenuecat_customer_id: data.revenuecat_customer_id || '',
    entitlement_id: data.entitlement_id || null,
    product_id: data.product_id || null,
    expires_at: data.expires_at || null,
    updated_at: now,
  };

  await docRef.set(entitlement, { merge: true });
  return entitlement;
}

export async function deleteEntitlement(uid: string): Promise<void> {
  await db.collection(COLLECTIONS.ENTITLEMENTS).doc(uid).delete();
}
