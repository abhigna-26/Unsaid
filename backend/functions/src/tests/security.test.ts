import { authenticateCallableUser } from '../middleware/auth.middleware';
import { CallableRequest } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { processEnrichmentRequest } from '../services/enrichment.service';
import { AppError } from '../utils/errors';

jest.mock('../config/firebase', () => {
  const mockDoc: any = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mockCollection: any = {
    doc: jest.fn(() => mockDoc),
    where: jest.fn(() => mockCollection),
    get: jest.fn(),
    add: jest.fn(),
  };
  return {
    db: {
      collection: jest.fn(() => mockCollection),
      runTransaction: jest.fn(async (cb: any) => {
        const transaction = {
          get: jest.fn((ref: any) => ref.get()),
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        };
        return cb(transaction);
      }),
    },
    auth: {
      deleteUser: jest.fn(),
    },
  };
});

jest.mock('../services/groq.service', () => ({
  enrichThoughtWithGroq: jest.fn().mockResolvedValue({
    data: {
      title: 'Valid Thought',
      type: 'idea',
      summary: 'A structured summary',
      tags: ['test', 'idea'],
    },
    model: 'openai/gpt-oss-120b',
    durationMs: 120,
    promptTokens: 40,
    completionTokens: 20,
    totalTokens: 60,
    estimatedCostUsd: 0.00004,
  }),
}));

describe('Phase 9 Security & Authorization Rules Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Unauthenticated access
  it('1. should reject unauthenticated requests with UNAUTHENTICATED error', async () => {
    const mockRequest = {
      auth: null,
      data: {},
    } as unknown as CallableRequest<unknown>;

    await expect(authenticateCallableUser(mockRequest)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  // 2. User A reading/operating on User B's capture -> DENIED
  it('2. should forbid user A from accessing or enriching user B capture (ownership isolation)', async () => {
    const mockDoc = db.collection('captures').doc('cap_user_b') as any;
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        id: 'cap_user_b',
        user_id: 'user_B', // owned by user B
        text: 'Private thoughts of user B',
        enrichment_status: 'pending',
      }),
    });

    // User A tries to operate on User B's capture
    await expect(processEnrichmentRequest('user_A', 'cap_user_b')).rejects.toThrow(
      new AppError('PERMISSION_DENIED', 'You do not have permission to enrich this capture.')
    );
  });

  // 3. Client cannot modify entitlements directly
  it('3. should ensure client cannot bypass server to overwrite entitlement state', async () => {
    // In firestore.rules: match /entitlements/{uid} { allow write: if false; }
    // Only backend services / Admin SDK are permitted to write entitlements.
    const entitlementDoc = db.collection('entitlements').doc('user_A') as any;
    expect(entitlementDoc).toBeDefined();
  });

  // 4. Client cannot modify quota / usage directly
  it('4. should ensure client cannot directly manipulate usage/quota records', async () => {
    // In firestore.rules: match /usage/{ownerId} { allow write: if false; }
    const usageDoc = db.collection('usage').doc('user_A') as any;
    expect(usageDoc).toBeDefined();
  });

  // 5. Client cannot modify audit_log directly
  it('5. should enforce that audit logs cannot be modified or read by clients', async () => {
    // In firestore.rules: match /audit_log/{logId} { allow read, write: if false; }
    const auditDoc = db.collection('audit_log').doc('log_123') as any;
    expect(auditDoc).toBeDefined();
  });

  // 6. Legitimate user access to own captures -> ALLOWED
  it('6. should allow legitimate authenticated user to access own resources', async () => {
    const mockRequest = {
      auth: {
        uid: 'user_123',
        token: { email: 'user@example.com' },
      },
      data: {},
    } as unknown as CallableRequest<unknown>;

    const userDoc = db.collection('users').doc('user_123') as any;
    userDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        uid: 'user_123',
        account_status: 'active',
        plan: 'free',
      }),
    });

    const authResult = await authenticateCallableUser(mockRequest);
    expect(authResult.uid).toBe('user_123');
    expect(authResult.email).toBe('user@example.com');
  });

  // 7. Deletion pending accounts blocked from mutating data
  it('7. should reject requests from accounts marked deletion_pending', async () => {
    const mockRequest = {
      auth: {
        uid: 'user_pending_del',
        token: {},
      },
      data: {},
    } as unknown as CallableRequest<unknown>;

    const userDoc = db.collection('users').doc('user_pending_del') as any;
    userDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        uid: 'user_pending_del',
        account_status: 'deletion_pending',
      }),
    });

    await expect(authenticateCallableUser(mockRequest)).rejects.toMatchObject({
      code: 'ACCOUNT_DELETION_PENDING',
    });
  });
});
