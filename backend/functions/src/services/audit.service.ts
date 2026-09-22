import { logAuditEvent } from '../repositories/audit.repository';
import { AuditActor, AuditAction } from '../types/audit.types';

export interface AuditEventParams {
  actor: AuditActor;
  action: AuditAction;
  target: string;
  result: 'success' | 'failure' | 'rejected';
  metadata?: Record<string, unknown>;
}

export async function recordAudit(params: AuditEventParams): Promise<string> {
  return await logAuditEvent(params);
}
