import { Timestamp } from 'firebase-admin/firestore';

export interface UsageDoc {
  owner_id: string; // UID for authenticated or device_id for anonymous
  daily_enrichments: number;
  weekly_enrichments: number;
  daily_reset_at: Timestamp | string;
  weekly_reset_at: Timestamp | string;
  updated_at: Timestamp | string;
}
