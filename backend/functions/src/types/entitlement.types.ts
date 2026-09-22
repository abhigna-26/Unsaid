import { Timestamp } from 'firebase-admin/firestore';
import { UserPlan } from './user.types';

export type EntitlementStatus =
  | 'active'
  | 'in_grace_period'
  | 'in_billing_retry'
  | 'expired';

export interface EntitlementDoc {
  uid: string;
  plan: UserPlan;
  status: EntitlementStatus;
  revenuecat_customer_id: string;
  entitlement_id?: string | null;
  product_id?: string | null;
  expires_at?: Timestamp | string | null;
  updated_at: Timestamp | string;
}
