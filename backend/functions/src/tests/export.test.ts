import { generateUserDataExport } from '../services/export.service';
import * as usersRepo from '../repositories/user.repository';
import * as entitlementsRepo from '../repositories/entitlement.repository';
import * as usageRepo from '../repositories/usage.repository';
import * as capturesRepo from '../repositories/capture.repository';
import * as enrichmentsRepo from '../repositories/enrichment.repository';

jest.mock('../repositories/user.repository');
jest.mock('../repositories/entitlement.repository');
jest.mock('../repositories/usage.repository');
jest.mock('../repositories/capture.repository');
jest.mock('../repositories/enrichment.repository');

describe('Data Export Service', () => {
  it('should compile complete user data into a clean JSON bundle', async () => {
    (usersRepo.getUser as jest.Mock).mockResolvedValue({
      uid: 'user_export_1',
      email: 'user@example.com',
      plan: 'pro',
      account_status: 'active',
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    });

    (entitlementsRepo.getEntitlement as jest.Mock).mockResolvedValue({
      uid: 'user_export_1',
      plan: 'pro',
      status: 'active',
    });

    (usageRepo.getUsage as jest.Mock).mockResolvedValue({
      owner_id: 'user_export_1',
      daily_enrichments: 5,
      weekly_enrichments: 12,
    });

    (capturesRepo.getUserCaptures as jest.Mock).mockResolvedValue([
      {
        id: 'cap_1',
        user_id: 'user_export_1',
        text: 'Test capture 1',
        enrichment_status: 'done',
      },
    ]);

    (enrichmentsRepo.getEnrichmentsForCaptures as jest.Mock).mockResolvedValue([
      {
        capture_id: 'cap_1',
        title: 'Test Capture 1',
        type: 'idea',
        summary: 'A test capture.',
        tags: ['test'],
      },
    ]);

    const exportData = await generateUserDataExport('user_export_1');

    expect(exportData.user?.uid).toBe('user_export_1');
    expect(exportData.captures.length).toBe(1);
    expect(exportData.captures[0].id).toBe('cap_1');
    expect(exportData.enrichments.length).toBe(1);
    expect(exportData.exported_at).toBeDefined();
    expect((exportData as any).audit_log).toBeUndefined();
  });
});
