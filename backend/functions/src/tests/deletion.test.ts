import { requestUserAccountDeletion, hardDeleteUserData } from '../services/deletion.service';
import * as usersRepo from '../repositories/user.repository';
import * as capturesRepo from '../repositories/capture.repository';
import * as enrichmentsRepo from '../repositories/enrichment.repository';
import * as usageRepo from '../repositories/usage.repository';
import * as entitlementsRepo from '../repositories/entitlement.repository';
import * as auditRepo from '../repositories/audit.repository';
import { auth } from '../config/firebase';

jest.mock('../repositories/user.repository');
jest.mock('../repositories/capture.repository');
jest.mock('../repositories/enrichment.repository');
jest.mock('../repositories/usage.repository');
jest.mock('../repositories/entitlement.repository');
jest.mock('../repositories/audit.repository');
jest.mock('../config/firebase', () => ({
  auth: {
    deleteUser: jest.fn(),
  },
  db: {
    collection: jest.fn(),
  },
}));

describe('Account Deletion Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usersRepo.markUserDeletionPending as jest.Mock).mockResolvedValue({
      scheduledDeletionDate: new Date('2026-09-27T00:00:00.000Z'),
    });
    (capturesRepo.deleteCapturesByUserId as jest.Mock).mockResolvedValue(['cap_1', 'cap_2']);
    (enrichmentsRepo.deleteEnrichmentsByCaptureIds as jest.Mock).mockResolvedValue(undefined);
    (usageRepo.deleteUsage as jest.Mock).mockResolvedValue(undefined);
    (entitlementsRepo.deleteEntitlement as jest.Mock).mockResolvedValue(undefined);
    (usersRepo.deleteUserDoc as jest.Mock).mockResolvedValue(undefined);
    (auth.deleteUser as jest.Mock).mockResolvedValue(undefined);
    (auditRepo.logAuditEvent as jest.Mock).mockResolvedValue('audit_del_123');
  });

  it('should initiate soft deletion with 7-day grace period', async () => {
    const result = await requestUserAccountDeletion('user_to_delete');
    expect(result.success).toBe(true);
    expect(result.grace_period_days).toBe(7);
    expect(usersRepo.markUserDeletionPending).toHaveBeenCalledWith('user_to_delete', 7);
    expect(auditRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account_deletion_requested',
        target: 'user_to_delete',
      })
    );
  });

  it('should execute hard delete cascade cleaning up all sub-resources and auth', async () => {
    await hardDeleteUserData('user_hard_delete');

    expect(capturesRepo.deleteCapturesByUserId).toHaveBeenCalledWith('user_hard_delete');
    expect(enrichmentsRepo.deleteEnrichmentsByCaptureIds).toHaveBeenCalledWith(['cap_1', 'cap_2']);
    expect(usageRepo.deleteUsage).toHaveBeenCalledWith('user_hard_delete');
    expect(entitlementsRepo.deleteEntitlement).toHaveBeenCalledWith('user_hard_delete');
    expect(usersRepo.deleteUserDoc).toHaveBeenCalledWith('user_hard_delete');
    expect(auth.deleteUser).toHaveBeenCalledWith('user_hard_delete');
    expect(auditRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account_hard_deleted',
        target: 'user_hard_delete',
      })
    );
  });

  it('should remain idempotent even if Firebase Auth user is already deleted', async () => {
    (auth.deleteUser as jest.Mock).mockRejectedValueOnce(new Error('auth/user-not-found'));

    await expect(hardDeleteUserData('user_already_partially_deleted')).resolves.not.toThrow();
    expect(usersRepo.deleteUserDoc).toHaveBeenCalledWith('user_already_partially_deleted');
  });
});
