# Thought Catcher - Security Architecture & Policies

This document outlines the security architecture, threat model, access control policies, and compliance considerations for the Thought Catcher backend.

---

## 1. Zero-Trust Security Model

All user requests are authenticated using **Firebase Authentication**. Cloud Functions extract and verify `request.auth.uid` tokens signed by Google Auth servers. Client-supplied user IDs are never trusted.

---

## 2. Firestore Security Matrix

- `users/{uid}`: Read/update own record. Plan and customer ID are locked server-side.
- `devices/{deviceId}`: Registered devices with server-managed quota fields.
- `captures/{captureId}`: Owner only access. Cannot forge enrichment status.
- `enrichments/{captureId}`: Read-only for capture owner. Written only by Cloud Functions via Admin SDK.
- `usage/{ownerId}`: Read-only for owner. Incremented and refunded only by Cloud Functions.
- `entitlements/{uid}`: Read-only for owner. Written exclusively via RevenueCat webhook.
- `audit_log/{logId}`: Append-only compliance log. Zero client access.
- `processed_events/{id}`: Webhook deduplication store. Zero client access.

---

## 3. Secret Isolation

- **Groq API Key**: Loaded only in Cloud Functions server runtime via Secret Manager / environment. Never sent to client.
- **RevenueCat Webhook Secret**: Validated solely on incoming webhook requests.

---

## 4. Compliance Disclosure

> [!NOTE]
> The backend implements technical foundations for GDPR (data export, soft deletion with 7-day grace period, hard delete cascade) and OWASP API security standards. This represents an engineering implementation and has not undergone formal 3rd-party certifications (SOC 2 / ISO 27001).
