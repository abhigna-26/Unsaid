import { Timestamp } from 'firebase-admin/firestore';

export interface DeviceDoc {
  device_id: string;
  created_at: Timestamp | string;
  last_seen_at: Timestamp | string;
  user_id?: string | null;
  daily_enrichment_count?: number;
  weekly_enrichment_count?: number;
  daily_reset_at?: Timestamp | string;
  weekly_reset_at?: Timestamp | string;
  app_check_verified?: boolean;
}
