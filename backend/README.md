# Thought Catcher - Backend Platform

Production-ready backend architecture for **Thought Catcher**, built with Firebase Cloud Functions v2, Firestore, Groq Cloud AI, and RevenueCat.

---

## Features

- 🧠 **AI Thought Enrichment**: Powered by Groq Cloud (`openai/gpt-oss-120b`) with structured JSON schema validation, automatic retry with backoff, and non-destructive raw capture updates.
- ⚡ **Realtime Cross-Device Sync**: Offline-first architecture using client-generated UUIDs as Firestore document IDs.
- 🛡️ **Zero-Trust Security**: Hardened Firestore Security Rules preventing unauthorized cross-user access, quota tampering, or plan self-escalation.
- 💳 **RevenueCat Subscription Integration**: Secure webhook processor updating user entitlements, handling grace periods, billing retries, and cancellations idempotently.
- 📊 **Server-Side Quota Engine**: Atomic daily (2/day) and weekly (10/week) free-tier quota tracking with automatic calendar resets and failure refunds.
- 🔒 **Firebase App Check**: Abuse prevention against unauthorized scripts and bot swarms.
- 🗑️ **Account Deletion & Data Export**: GDPR/Privacy-compliant soft-deletion with 7-day grace period, daily scheduled hard deletion cascade, and full JSON data export.
- 📜 **Append-Only Audit Logging**: Tamper-proof compliance records for account deletions, plan modifications, and system events.

---

## Directory Structure

```
backend/
├── README.md
├── BACKEND_SETUP.md
├── SECURITY.md
├── API.md
├── .env.example
├── .gitignore
├── firebase.json
├── .firebaserc
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── tsconfig.json
│
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/             # Environment and Firebase Admin config
│   │   ├── functions/          # Callable, HTTPS, and Scheduled triggers
│   │   ├── services/           # Groq, RevenueCat, Quota, Deletion services
│   │   ├── repositories/       # Firestore data access layer
│   │   ├── middleware/         # Auth, App Check, Validation middleware
│   │   ├── validation/         # Zod schemas
│   │   ├── types/              # TypeScript models and interfaces
│   │   ├── utils/              # Errors, Logging, Timestamps, Constants
│   │   └── tests/              # Jest automated test suite
│
└── emulator/
    ├── seed.ts                 # Local development test seed data
    └── README.md               # Emulator instructions
```

---

## Quickstart & Local Development

### 1. Installation
```bash
cd backend
npm install
npm --prefix functions install
```

### 2. Environment Variables
Copy `.env.example` to `functions/.env`:
```bash
cp .env.example functions/.env
```

### 3. Build & Test
```bash
npm run build
npm test
npm run lint
```

### 4. Start Firebase Emulators
```bash
npm run emulators
```
Access the Emulator UI at `http://localhost:4000`.
