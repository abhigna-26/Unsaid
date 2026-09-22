import { checkAndIncrementUsageAtomic, refundUsageAtomic } from '../repositories/usage.repository';

let mockStore: Record<string, any> = {};

jest.mock('../config/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn((docId: string) => ({
        _path: docId,
        get: jest.fn(async () => ({
          exists: !!mockStore[docId],
          data: () => mockStore[docId],
        })),
        set: jest.fn(async (data: any, options?: any) => {
          if (options?.merge && mockStore[docId]) {
            mockStore[docId] = { ...mockStore[docId], ...data };
          } else {
            mockStore[docId] = data;
          }
        }),
        update: jest.fn(async (data: any) => {
          mockStore[docId] = { ...mockStore[docId], ...data };
        }),
      })),
    })),
    runTransaction: jest.fn(async (callback: (t: any) => Promise<any>) => {
      const transaction = {
        get: jest.fn(async (docRef: any) => {
          const path = docRef._path || 'owner_1';
          return {
            exists: !!mockStore[path],
            data: () => mockStore[path],
          };
        }),
        set: jest.fn((docRef: any, data: any) => {
          const path = docRef._path || 'owner_1';
          mockStore[path] = { ...mockStore[path], ...data };
        }),
        update: jest.fn((docRef: any, data: any) => {
          const path = docRef._path || 'owner_1';
          mockStore[path] = { ...mockStore[path], ...data };
        }),
      };
      return await callback(transaction);
    }),
  },
}));

describe('Quota and Usage Management', () => {
  beforeEach(() => {
    mockStore = {};
  });

  it('should allow free user under daily quota (1 of 2)', async () => {
    const result = await checkAndIncrementUsageAtomic('user_free', false, 2, 10);
    expect(result.dailyCount).toBe(1);
    expect(result.weeklyCount).toBe(1);
    expect(result.isPro).toBe(false);
  });

  it('should allow free user to reach limit (2 of 2)', async () => {
    await checkAndIncrementUsageAtomic('owner_1', false, 2, 10);
    const result2 = await checkAndIncrementUsageAtomic('owner_1', false, 2, 10);
    expect(result2.dailyCount).toBe(2);
  });

  it('should block free user when daily quota (2/2) is exceeded', async () => {
    await checkAndIncrementUsageAtomic('owner_1', false, 2, 10);
    await checkAndIncrementUsageAtomic('owner_1', false, 2, 10);

    await expect(checkAndIncrementUsageAtomic('owner_1', false, 2, 10)).rejects.toMatchObject({
      code: 'QUOTA_EXCEEDED',
      message: expect.stringContaining('Daily enrichment quota reached'),
    });
  });

  it('should allow Pro users to exceed free quota limits without blocking', async () => {
    await checkAndIncrementUsageAtomic('owner_1', true, 2, 10);
    await checkAndIncrementUsageAtomic('owner_1', true, 2, 10);
    const result3 = await checkAndIncrementUsageAtomic('owner_1', true, 2, 10);
    const result4 = await checkAndIncrementUsageAtomic('owner_1', true, 2, 10);

    expect(result3.dailyCount).toBe(3);
    expect(result4.dailyCount).toBe(4);
    expect(result4.isPro).toBe(true);
  });

  it('should refund quota atomically when an enrichment fails', async () => {
    await checkAndIncrementUsageAtomic('owner_1', false, 2, 10);
    expect(mockStore['owner_1'].daily_enrichments).toBe(1);

    await refundUsageAtomic('owner_1');
    expect(mockStore['owner_1'].daily_enrichments).toBe(0);
  });
});
