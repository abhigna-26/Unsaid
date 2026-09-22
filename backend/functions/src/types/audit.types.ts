import { Timestamp } from 'firebase-admin/firestore';

export type AuditActor = 'user' | 'system' | 'revenuecat_webhook' | 'admin';
export type AuditAction =
  | 'account_deletion_requested'
  | 'account_hard_deleted'
  | 'entitlement_created'
  | 'entitlement_updated'
  | 'entitlement_revoked'
  | 'enrichment_quota_exceeded'
  | 'device_migrated'
  | 'admin_access';

export interface AuditLogDoc {
  id?: string;
  actor: AuditActor;
  action: AuditAction;
  target: string;
  timestamp: Timestamp | string;
  result: 'success' | 'failure' | 'rejected';
  metadata?: Record<string, unknown>;
}

export interface ProcessedEventDoc {
  event_id: string;
  event_type: string;
  received_at: Timestamp | string;
  processed_at: Timestamp | string;
  result: 'success' | 'ignored_duplicate' | 'error';
  error_message?: string | null;
}
