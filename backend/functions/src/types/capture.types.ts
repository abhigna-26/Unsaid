import { Timestamp } from 'firebase-admin/firestore';

export type EnrichmentStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface CaptureDoc {
  id: string; // Capture UUID is document ID
  user_id: string;
  device_id?: string | null;
  text: string;
  voice_transcript_reference?: string | null;
  created_at: Timestamp | string;
  updated_at: Timestamp | string;
  enrichment_status: EnrichmentStatus;
  deleted_at?: Timestamp | string | null;
}
