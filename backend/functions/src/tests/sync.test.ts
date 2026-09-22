import { migrateDeviceToUser } from '../services/capture.service';
import * as userRepo from '../repositories/user.repository';
import * as deviceRepo from '../repositories/device.repository';
import * as captureRepo from '../repositories/capture.repository';
import * as auditRepo from '../repositories/audit.repository';

jest.mock('../repositories/user.repository');
jest.mock('../repositories/device.repository');
jest.mock('../repositories/capture.repository');
jest.mock('../repositories/audit.repository');

describe('Device to User Migration & Cross-Device Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userRepo.associateDeviceWithUser as jest.Mock).mockResolvedValue(undefined);
    (deviceRepo.linkDeviceToUser as jest.Mock).mockResolvedValue(undefined);
    (captureRepo.reassignCapturesToUser as jest.Mock).mockResolvedValue(2);
    (auditRepo.logAuditEvent as jest.Mock).mockResolvedValue('audit_mig_123');
  });

  it('should link device and reassign captures to the authenticated user', async () => {
    const response = await migrateDeviceToUser('auth_user_1', 'dev_uuid_999', ['cap_uuid_1', 'cap_uuid_2']);

    expect(response.success).toBe(true);
    expect(response.migrated_count).toBe(2);
    expect(userRepo.associateDeviceWithUser).toHaveBeenCalledWith('auth_user_1', 'dev_uuid_999');
    expect(deviceRepo.linkDeviceToUser).toHaveBeenCalledWith('dev_uuid_999', 'auth_user_1');
    expect(captureRepo.reassignCapturesToUser).toHaveBeenCalledWith(['cap_uuid_1', 'cap_uuid_2'], 'auth_user_1');
    expect(auditRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'device_migrated',
        target: 'auth_user_1',
      })
    );
  });
});
