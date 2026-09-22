# Thought Catcher - Firebase Emulator Suite

This directory contains utilities for running and seeding the local Firebase Emulator Suite.

---

## Running Emulators

From the `backend/` directory:

```bash
npm run emulators
```

This starts:
- **Auth Emulator**: `http://localhost:9099`
- **Firestore Emulator**: `http://localhost:8080`
- **Cloud Functions Emulator**: `http://localhost:5001`
- **Emulator UI**: `http://localhost:4000`

---

## Seeding Test Data

To seed the local emulators with test users, entitlements, and sample captures:

```bash
npm run seed
```
