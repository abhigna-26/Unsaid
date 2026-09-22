import { Timestamp } from 'firebase-admin/firestore';

export type AccountStatus = 'active' | 'deletion_pending' | 'deleted';
export type UserPlan = 'free' | 'pro';

export interface UserDoc {
  uid: string;
  email?: string | null;
  display_name?: string | null;
  photo_url?: string | null;
  plan: UserPlan;
  device_ids?: string[];
  revenuecat_customer_id?: string | null;
  created_at: Timestamp | string;
  updated_at: Timestamp | string;
  deleted_at?: Timestamp | string | null;
  deletion_scheduled_for?: Timestamp | string | null;
  account_status: AccountStatus;
}
