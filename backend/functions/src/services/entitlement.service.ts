import { getEntitlement, upsertEntitlement, deleteEntitlement } from '../repositories/entitlement.repository';
import { EntitlementDoc } from '../types/entitlement.types';

export async function getUserEntitlement(uid: string): Promise<EntitlementDoc | null> {
  return await getEntitlement(uid);
}

export async function syncUserEntitlement(uid: string, data: Partial<EntitlementDoc>): Promise<EntitlementDoc> {
  return await upsertEntitlement(uid, data);
}

export async function clearUserEntitlement(uid: string): Promise<void> {
  await deleteEntitlement(uid);
}
