# Thought Catcher - Backend API Reference

This document provides the exact contract specification for all Cloud Functions in the Thought Catcher backend.

---

## 1. `requestEnrichment`

### Purpose
Analyzes a captured thought using Groq AI (`openai/gpt-oss-120b`), generates high-clarity metadata (title, thought type, summary, tags), saves it in a separate `enrichments/{captureId}` document, updates the capture status to `done`, and records cost/usage metadata.

- **Type**: Callable Cloud Function (`httpsCallable`)
- **Authentication**: Required (`request.auth.uid`)
- **App Check**: Required in production
- **Region**: `asia-south1`

### Input Payload
```typescript
interface RequestEnrichmentRequest {
  capture_id: string;      // UUID of the capture document in Firestore (Required)
  force_retry?: boolean;   // Optional: true to re-run AI on an already enriched capture
}
```

### Response Payload
```typescript
interface RequestEnrichmentResponse {
  success: boolean;
  capture_id: string;
  status: 'done' | 'failed' | 'processing';
  enrichment?: {
    title: string;
    type: 'actionable_task' | 'idea' | 'journal' | 'meeting_note' | 'question' | 'reference';
    summary: string;
    tags: string[];
  };
  error?: string;
}
```

### Possible Errors
| Error Code | HTTP Status | Reason |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Missing authentication token |
| `PERMISSION_DENIED` | 403 | User does not own this capture |
| `ACCOUNT_DELETION_PENDING` | 403 | Account is currently in deletion grace period |
| `RESOURCE_NOT_FOUND` | 404 | Capture document does not exist |
| `QUOTA_EXCEEDED` | 429 | Free tier daily (2) or weekly (10) limit reached |
| `AI_SERVICE_ERROR` | 502 | Groq LLM failure after automatic retry (Quota refunded) |

---

## 2. `revenueCatWebhook`

### Purpose
Processes subscription lifecycle webhooks emitted by RevenueCat, deduplicates events, and updates cached entitlement status and user plan.

- **Type**: HTTPS POST Endpoint (`onRequest`)
- **Endpoint**: `POST https://<region>-<project-id>.cloudfunctions.net/revenueCatWebhook`
- **Authentication**: Shared Bearer Secret (`Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`)
- **App Check**: Not applicable (server-to-server webhook)

### Webhook Event Types Handled
- `INITIAL_PURCHASE` → Grants `plan = 'pro'`, `status = 'active'`
- `RENEWAL` → Maintains `plan = 'pro'`, `status = 'active'`
- `UNCANCELLATION` → Restores `plan = 'pro'`, `status = 'active'`
- `BILLING_ISSUE` → Sets `status = 'in_billing_retry'` (or `'in_grace_period'`)
- `CANCELLATION` → Sets active until expiration, then expired
- `EXPIRATION` → Downgrades to `plan = 'free'`, `status = 'expired'`

---

## 3. `requestAccountDeletion`

### Purpose
Initiates user account soft-deletion with a 7-day grace period. Immediately blocks active API access and sync, and schedules permanent data erasure.

- **Type**: Callable Cloud Function (`httpsCallable`)
- **Authentication**: Required (`request.auth.uid`)
- **App Check**: Required in production

### Input Payload
```typescript
interface RequestAccountDeletionRequest {
  confirm?: boolean;
}
```

### Response Payload
```typescript
interface RequestAccountDeletionResponse {
  success: boolean;
  scheduled_deletion_date: string; // ISO 8601 UTC timestamp (now + 7 days)
  grace_period_days: number;       // 7
}
```

---

## 4. `exportUserData`

### Purpose
Exports all user-owned data in clean structured JSON for data portability and privacy compliance.

- **Type**: Callable Cloud Function (`httpsCallable`)
- **Authentication**: Required (`request.auth.uid`)
- **App Check**: Required in production

### Response Payload
```typescript
interface ExportUserDataResponse {
  user: UserDoc | null;
  entitlement: EntitlementDoc | null;
  usage: UsageDoc | null;
  captures: CaptureDoc[];
  enrichments: EnrichmentDoc[];
  exported_at: string;
}
```

---

## 5. `migrateDeviceCaptures`

### Purpose
Associates anonymous device captures with a user account upon login without duplicating documents.

- **Type**: Callable Cloud Function (`httpsCallable`)
- **Authentication**: Required (`request.auth.uid`)
- **App Check**: Required in production

### Input Payload
```typescript
interface MigrateDeviceCapturesRequest {
  device_id: string;
  capture_ids: string[];
}
```

### Response Payload
```typescript
interface MigrateDeviceCapturesResponse {
  success: boolean;
  migrated_count: number;
  capture_ids: string[];
}
```

---

## 6. `scheduledHardDeletion`

### Purpose
Daily scheduled worker running at 03:00 UTC. Permanently purges user profiles, captures, enrichments, usage, entitlements, and Firebase Auth records for accounts whose 7-day deletion grace period has passed.

- **Type**: Scheduled Cloud Function (Cloud Scheduler / PubSub)
- **Schedule**: `0 3 * * *` (Daily at 03:00 UTC)

---

## 7. `health`

### Purpose
Lightweight public endpoint for health checks, uptime monitoring, and smoke testing without requiring authentication or leaking internal secrets.

- **Type**: HTTPS GET Endpoint (`onRequest`)
- **Endpoint**: `GET https://<region>-<project-id>.cloudfunctions.net/health`
- **Authentication**: None (Public)
- **Response**:
```json
{
  "status": "ok",
  "service": "thought-catcher-backend",
  "environment": "production",
  "region": "asia-south1",
  "firebase": "connected",
  "groq_configured": true,
  "groq_model": "openai/gpt-oss-120b",
  "revenuecat_configured": true,
  "timestamp": "2026-09-22T15:25:00.000Z"
}
```

