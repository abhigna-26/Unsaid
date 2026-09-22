# Thought Catcher - Backend Setup & Deployment Guide

This document details the configuration, local development setup, manual configuration steps, and production deployment instructions for the Thought Catcher backend.

---

# Manual Setup Still Required

Below is the exact separation of what is already completed vs what still needs manual configuration in the Firebase Console, Groq Cloud, or RevenueCat dashboard.

## ✅ ALREADY COMPLETED
- **Firebase Project**: Thought Catcher project created in Firebase Console.
- **Firebase Authentication**: Enabled with Google Provider and Email/Password Provider.
- **Cloud Firestore**: Provisioned in Standard edition (`(default)` database in region `asia-south1` / Mumbai).
- **Groq API Key**: Created in Groq Console (kept strictly private).

---

## 📋 STILL REQUIRED

### 1. Firebase CLI Login & Local Project Selection
* **Why required**: Connects local development machine and Firebase CLI to your Google account.
* **Environment**: Local development & Deployment.
* **Step-by-step**:
  1. Open terminal in the `backend/` folder.
  2. Run: `firebase login`
  3. When prompted in your browser, select your Google account and grant permissions.
  4. Run: `firebase use --add`
  5. Select the existing `thought-catcher-app` (or your exact Thought Catcher project ID).
  6. Set alias to `default` or `production`.

---

### 2. Local Groq API Key Configuration
* **Why required**: Allows running local Cloud Functions with real Groq LLM enrichment without deploying.
* **Environment**: Local Emulator Development.
* **Step-by-step**:
  1. Open `backend/functions/`.
  2. Copy `.secret.local.example` to `.secret.local`:
     ```bash
     cp functions/.secret.local.example functions/.secret.local
     ```
  3. Open `functions/.secret.local` and add your Groq API key:
     ```env
     GROQ_API_KEY=gsk_your_actual_key_here
     ```
  4. Note: `functions/.secret.local` is gitignored and will never be committed or printed.

---

### 3. Production Groq Secret in Google Secret Manager
* **Why required**: Cloud Functions v2 uses Google Cloud Secret Manager (`defineSecret("GROQ_API_KEY")`) to securely inject the API key at runtime without exposing it in environment variables or logs.
* **Environment**: Production.
* **Step-by-step**:
  1. In terminal inside `backend/`:
     ```bash
     firebase functions:secrets:set GROQ_API_KEY
     ```
  2. When prompted: `? Enter a value for GROQ_API_KEY:` paste your Groq API key (input is masked).
  3. Firebase CLI will automatically create the secret in Google Cloud Secret Manager and grant access to the Cloud Functions service account.

---

### 4. Production Billing Upgrade (Blaze Plan)
* **Why required**: Google Cloud Functions (2nd Gen) requires the Google Cloud / Firebase **Blaze (Pay as you go)** plan to build container images with Cloud Build and run Eventarc / Secret Manager integrations. The free Spark plan does not support Cloud Functions deployment.
* **Environment**: Production deployment only.
* **Step-by-step**:
  1. Go to [Firebase Console](https://console.firebase.google.com/) -> Select "Thought Catcher".
  2. In the bottom-left corner of the sidebar, click **Upgrade** (next to "Spark plan").
  3. Select **Blaze plan** and link your Google Cloud Billing Account.
  4. Set a monthly budget alert (e.g. $5 or $10) in Google Cloud Billing to prevent unexpected charges.

---

### 5. RevenueCat Webhook & Entitlement Configuration
* **Why required**: Validates and synchronizes in-app purchases and subscriptions to Firestore (`entitlements` collection) via server-to-server webhook.
* **Environment**: Production & Staging.
* **Step-by-step**:
  1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/) -> Select your Project.
  2. Under **Project Settings** -> **Integrations** -> Click **Webhooks**.
  3. Set **Webhook URL**:
     ```
     https://revenuecatwebhook-<hash>-el.a.run.app
     ```
     *(Obtained after deploying Cloud Functions to `asia-south1`)*.
  4. Under **Authorization Header**, enter a secret bearer token:
     ```
     Bearer your_generated_webhook_secret_here
     ```
  5. In Firebase Cloud Functions, set the matching secret:
     ```bash
     firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
     ```
     or set in environment variables if non-secret.

---

### 6. Firebase App Check Registration
* **Why required**: Protects Cloud Functions from unauthorized bots, scrapers, and abuse.
* **Environment**: Production.
* **Step-by-step**:
  1. Go to [Firebase Console](https://console.firebase.google.com/) -> **App Check**.
  2. Register your Web App (using **reCAPTCHA v3** or **reCAPTCHA Enterprise**) and/or Mobile App (**Play Integrity** for Android / **DeviceCheck/App Attest** for iOS).
  3. In `backend/functions/.env`: set `ENFORCE_APP_CHECK=true` for production enforcement.

---

# Local Verification Commands

The backend includes automated verification workflows:

```bash
# 1. Full Backend Verification (Build + Lint + 24 Unit/Security Tests + Rules + Secret Check)
npm run verify

# 2. Real Groq AI Connectivity Verification (Masked Key Test)
npm run verify:groq

# 3. Start Local Firebase Emulator Suite (Auth, Firestore, Functions, UI)
npm run emulators

# 4. Seed Local Emulator with Sample Data
npm run seed
```

---

# Architecture & Endpoints Summary

### Exported Cloud Functions (Region: `asia-south1`)
1. **`requestEnrichment`** (Callable / 2nd Gen): Processes AI enrichment via Groq, enforces daily/weekly quotas, retries with backoff on network failures, and stores output in `enrichments` and `captures`.
2. **`revenueCatWebhook`** (HTTP POST / 2nd Gen): Authenticates RevenueCat webhook payloads, deduplicates event IDs, and maintains user subscription entitlements in `entitlements/{uid}`.
3. **`requestAccountDeletion`** (Callable / 2nd Gen): Initiates soft deletion with 7-day grace period, setting `account_status: deletion_pending` and `deletion_scheduled_for`.
4. **`scheduledHardDeletion`** (Scheduled Cron / 2nd Gen): Nightly worker at `0 3 * * * UTC` executing irreversible cascading deletion of Firestore records and Firebase Auth accounts past the grace period.
5. **`exportUserData`** (Callable / 2nd Gen): Assembles a GDPR/privacy-compliant JSON export containing user profile, captures, enrichments, and device records.
6. **`migrateDeviceCaptures`** (Callable / 2nd Gen): Links anonymous device captures to a newly authenticated user account during onboarding.
7. **`health`** (HTTP GET / 2nd Gen): Safe health check endpoint returning system status, region, and service connectivity without exposing secrets.
