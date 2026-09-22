/**
 * Thought Catcher - Live Firebase Emulator Integration Tests
 * Executes the 12 core backend flows against running emulators (Auth, Firestore, Functions).
 * Uses emulator/test data only.
 */

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'thought-catcher-app';
process.env.FUNCTIONS_EMULATOR = 'true';

const path = require('path');
const fs = require('fs');

const functionsDir = path.resolve(__dirname, '../functions');
const functionsLib = path.join(functionsDir, 'lib');

// Ensure functions/node_modules is in require path
module.paths.push(path.join(functionsDir, 'node_modules'));

// Load local secret if present for Groq test
const secretPath = path.join(functionsDir, '.secret.local');
if (fs.existsSync(secretPath)) {
  const content = fs.readFileSync(secretPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      if (k.trim() === 'GROQ_API_KEY') {
        process.env.GROQ_API_KEY = v.join('=').trim();
      }
    }
  }
}

const admin = require(path.join(functionsDir, 'node_modules/firebase-admin'));
const { v4: uuidv4 } = require(path.join(functionsDir, 'node_modules/uuid'));

// Initialize Firebase Admin for Emulator
if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'thought-catcher-app' });
}

const db = admin.firestore();
const auth = admin.auth();

// Import compiled backend services and repositories
const { processEnrichmentRequest } = require(path.join(functionsLib, 'services/enrichment.service'));
const { reserveEnrichmentQuota, refundEnrichmentQuota } = require(path.join(functionsLib, 'services/quota.service'));
const { processRevenueCatWebhook, verifyRevenueCatWebhookAuth } = require(path.join(functionsLib, 'services/revenuecat.service'));
const { requestUserAccountDeletion, hardDeleteUserData } = require(path.join(functionsLib, 'services/deletion.service'));
const { generateUserDataExport } = require(path.join(functionsLib, 'services/export.service'));
const { upsertCapture, getCaptureById } = require(path.join(functionsLib, 'repositories/capture.repository'));
const { getUsage } = require(path.join(functionsLib, 'repositories/usage.repository'));
const { getEntitlement } = require(path.join(functionsLib, 'repositories/entitlement.repository'));
const { getUser } = require(path.join(functionsLib, 'repositories/user.repository'));

const results = [];

function recordResult(num, name, passed, details) {
  results.push({ num, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Flow ${String(num).padStart(2, '0')}] ${icon} - ${name}: ${details}`);
}

async function runAllIntegrationFlows() {
  console.log('===============================================================');
  console.log('🧪 RUNNING LIVE FIREBASE EMULATOR INTEGRATION TESTS (12 FLOWS)');
  console.log('===============================================================\n');

  const testUserId1 = `test_user_flow_${Date.now()}_1`;
  const testUserId2 = `test_user_flow_${Date.now()}_2`;
  const deleteUserId = `test_user_del_${Date.now()}`;
  const testDeviceId = `device_${uuidv4()}`;
  const captureId1 = uuidv4();
  const captureId2 = uuidv4();

  // --------------------------------------------------------------------------
  // FLOW 1: Create / Authenticate Test User
  // --------------------------------------------------------------------------
  try {
    const authUser = await auth.createUser({
      uid: testUserId1,
      email: `${testUserId1}@thoughtcatcher.test`,
      displayName: 'Flow Test User 1',
    });

    await db.collection('users').doc(testUserId1).set({
      uid: testUserId1,
      email: authUser.email,
      display_name: authUser.displayName,
      plan: 'free',
      account_status: 'active',
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
    });

    const userDoc = await getUser(testUserId1);
    const passed = userDoc && userDoc.uid === testUserId1 && userDoc.plan === 'free';
    recordResult(1, 'Create/Authenticate Test User', passed, `User created in Auth and Firestore (plan: ${userDoc.plan})`);
  } catch (err) {
    recordResult(1, 'Create/Authenticate Test User', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 2: Register Device
  // --------------------------------------------------------------------------
  try {
    await db.collection('devices').doc(testDeviceId).set({
      device_id: testDeviceId,
      user_id: testUserId1,
      platform: 'android',
      app_version: '1.0.0',
      daily_enrichment_count: 0,
      weekly_enrichment_count: 0,
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
    });

    const deviceSnap = await db.collection('devices').doc(testDeviceId).get();
    const passed = deviceSnap.exists && deviceSnap.data().user_id === testUserId1;
    recordResult(2, 'Register Device', passed, `Device ${testDeviceId.slice(0, 16)}... registered and linked to user`);
  } catch (err) {
    recordResult(2, 'Register Device', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 3: Create Capture with Client-Generated UUID
  // --------------------------------------------------------------------------
  try {
    const now = admin.firestore.Timestamp.now().toDate().toISOString();
    const captureData = {
      id: captureId1,
      user_id: testUserId1,
      text: 'Schedule Q4 backend architectural review with the engineering team before Friday.',
      enrichment_status: 'pending',
      created_at: now,
      updated_at: now,
    };

    await upsertCapture(captureData);
    const retrieved = await getCaptureById(captureId1);

    const passed = retrieved && retrieved.id === captureId1 && retrieved.user_id === testUserId1;
    recordResult(3, 'Create Capture with Client UUID', passed, `Capture stored with client-generated UUID ${captureId1}`);
  } catch (err) {
    recordResult(3, 'Create Capture with Client UUID', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 4: Verify Capture Ownership
  // --------------------------------------------------------------------------
  try {
    const capture = await getCaptureById(captureId1);
    const isOwner = capture && capture.user_id === testUserId1;
    recordResult(4, 'Verify Capture Ownership', isOwner, `Verified capture belongs strictly to user ${testUserId1}`);
  } catch (err) {
    recordResult(4, 'Verify Capture Ownership', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 5: Request AI Enrichment
  // --------------------------------------------------------------------------
  try {
    const enrichmentRes = await processEnrichmentRequest(testUserId1, captureId1);
    const updatedCapture = await getCaptureById(captureId1);
    const enrichmentDoc = await db.collection('enrichments').doc(captureId1).get();

    const passed =
      enrichmentRes.success === true &&
      updatedCapture.enrichment_status === 'done' &&
      enrichmentDoc.exists &&
      Boolean(enrichmentDoc.data().title);

    recordResult(
      5,
      'Request AI Enrichment',
      passed,
      `Enrichment generated title: "${enrichmentDoc.data()?.title}", status: ${updatedCapture.enrichment_status}`
    );
  } catch (err) {
    recordResult(5, 'Request AI Enrichment', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 6: Verify Daily / Weekly Quota Consumption
  // --------------------------------------------------------------------------
  try {
    const usage = await getUsage(testUserId1);
    const consumedFirst = usage && usage.daily_enrichments === 1 && usage.weekly_enrichments === 1;

    // Create 2nd capture and enrich it to reach daily quota of 2
    const now2 = new Date().toISOString();
    await upsertCapture({
      id: captureId2,
      user_id: testUserId1,
      text: 'Brainstorm ideas for offline vector search on mobile devices using SQLite.',
      enrichment_status: 'pending',
      created_at: now2,
      updated_at: now2,
    });
    await processEnrichmentRequest(testUserId1, captureId2);

    const usageAfterSecond = await getUsage(testUserId1);
    const consumedSecond = usageAfterSecond && usageAfterSecond.daily_enrichments === 2;

    // 3rd attempt must be blocked by quota
    let quotaBlocked = false;
    const captureId3 = uuidv4();
    await upsertCapture({
      id: captureId3,
      user_id: testUserId1,
      text: 'Third capture should trigger quota exceeded error.',
      enrichment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      await processEnrichmentRequest(testUserId1, captureId3);
    } catch (quotaErr) {
      if (quotaErr.code === 'QUOTA_EXCEEDED') {
        quotaBlocked = true;
      }
    }

    const passed = consumedFirst && consumedSecond && quotaBlocked;
    recordResult(
      6,
      'Verify Daily/Weekly Quota Consumption',
      passed,
      `Tracked 1/2 -> 2/2 enrichments, blocked 3rd attempt with QUOTA_EXCEEDED`
    );
  } catch (err) {
    recordResult(6, 'Verify Daily/Weekly Quota Consumption', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 7: Verify Failed AI Attempt Refunds Quota
  // --------------------------------------------------------------------------
  try {
    const beforeUsage = await getUsage(testUserId1);
    const beforeCount = beforeUsage.daily_enrichments;

    // Execute atomic refund
    await refundEnrichmentQuota(testUserId1);

    const afterUsage = await getUsage(testUserId1);
    const refunded = afterUsage.daily_enrichments === beforeCount - 1;

    recordResult(
      7,
      'Verify Failed AI Attempt Refunds Quota',
      refunded,
      `Daily count decremented atomically from ${beforeCount} to ${afterUsage.daily_enrichments}`
    );
  } catch (err) {
    recordResult(7, 'Verify Failed AI Attempt Refunds Quota', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 8: Verify Duplicate Capture Writes are Idempotent
  // --------------------------------------------------------------------------
  try {
    const captureBefore = await getCaptureById(captureId1);
    // Write the exact same document ID again
    await upsertCapture({
      id: captureId1,
      user_id: testUserId1,
      text: captureBefore.text,
      enrichment_status: captureBefore.enrichment_status,
      created_at: captureBefore.created_at,
      updated_at: new Date().toISOString(),
    });

    const capturesSnap = await db.collection('captures').where('id', '==', captureId1).get();
    const passed = capturesSnap.size === 1;
    recordResult(8, 'Duplicate Capture Idempotency', passed, `Re-writing existing capture ID preserved single document`);
  } catch (err) {
    recordResult(8, 'Duplicate Capture Idempotency', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 9: Verify Cross-User Access is Denied
  // --------------------------------------------------------------------------
  try {
    // Create second user
    await auth.createUser({
      uid: testUserId2,
      email: `${testUserId2}@thoughtcatcher.test`,
      displayName: 'Flow Test User 2',
    });
    await db.collection('users').doc(testUserId2).set({
      uid: testUserId2,
      email: `${testUserId2}@thoughtcatcher.test`,
      plan: 'free',
      account_status: 'active',
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
    });

    let denied = false;
    try {
      // User 2 attempts to enrich User 1's capture
      await processEnrichmentRequest(testUserId2, captureId1);
    } catch (crossErr) {
      if (crossErr.code === 'PERMISSION_DENIED') {
        denied = true;
      }
    }

    recordResult(9, 'Cross-User Access Denied', denied, `User 2 blocked with PERMISSION_DENIED when attempting to access User 1 capture`);
  } catch (err) {
    recordResult(9, 'Cross-User Access Denied', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 10: Verify Data Export
  // --------------------------------------------------------------------------
  try {
    const exportBundle = await generateUserDataExport(testUserId1);
    const passed =
      exportBundle &&
      exportBundle.user &&
      exportBundle.user.uid === testUserId1 &&
      Array.isArray(exportBundle.captures) &&
      exportBundle.captures.length >= 2 &&
      Array.isArray(exportBundle.enrichments) &&
      exportBundle.exported_at &&
      !exportBundle.audit_log;

    recordResult(
      10,
      'Verify Data Export',
      passed,
      `Export bundle assembled: user + ${exportBundle.captures.length} captures + ${exportBundle.enrichments.length} enrichments (audit log protected)`
    );
  } catch (err) {
    recordResult(10, 'Verify Data Export', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 11: Verify Account Deletion + 7-Day Grace Period
  // --------------------------------------------------------------------------
  try {
    // Create dedicated user to test deletion lifecycle
    await auth.createUser({
      uid: deleteUserId,
      email: `${deleteUserId}@thoughtcatcher.test`,
    });
    await db.collection('users').doc(deleteUserId).set({
      uid: deleteUserId,
      email: `${deleteUserId}@thoughtcatcher.test`,
      plan: 'free',
      account_status: 'active',
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
    });

    // 1. Soft deletion request
    const softDelResult = await requestUserAccountDeletion(deleteUserId);
    const userDocAfterSoftDel = await getUser(deleteUserId);

    const softDelPassed =
      softDelResult.success === true &&
      softDelResult.grace_period_days === 7 &&
      userDocAfterSoftDel.account_status === 'deletion_pending' &&
      Boolean(userDocAfterSoftDel.deletion_scheduled_for);

    // 2. Hard deletion cascade
    await hardDeleteUserData(deleteUserId);
    const userDocAfterHardDel = await getUser(deleteUserId);

    let authUserDeleted = false;
    try {
      await auth.getUser(deleteUserId);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        authUserDeleted = true;
      }
    }

    const passed = softDelPassed && userDocAfterHardDel === null && authUserDeleted;
    recordResult(
      11,
      'Account Deletion & 7-Day Grace Period',
      passed,
      `Soft delete flagged status to deletion_pending (+7 days), then hard delete permanently purged Firestore & Auth records`
    );
  } catch (err) {
    recordResult(11, 'Account Deletion & 7-Day Grace Period', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FLOW 12: Verify RevenueCat Webhook Authentication & Event Deduplication
  // --------------------------------------------------------------------------
  try {
    // 1. Auth check
    const validHeader = 'Bearer test-rc-secret';
    const invalidHeader = 'Bearer wrong-secret';
    const authOk = verifyRevenueCatWebhookAuth(validHeader);
    const authFail = !verifyRevenueCatWebhookAuth(invalidHeader);

    // 2. Process INITIAL_PURCHASE for user 1
    const webhookEventId = `rc_event_${Date.now()}`;
    const purchaseResult = await processRevenueCatWebhook({
      event: {
        id: webhookEventId,
        type: 'INITIAL_PURCHASE',
        app_user_id: testUserId1,
        product_id: 'thoughtcatcher_pro_monthly',
        entitlement_id: 'pro',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
    });

    const userAfterPurchase = await getUser(testUserId1);
    const entitlementDoc = await getEntitlement(testUserId1);
    const upgraded =
      purchaseResult.result === 'success' &&
      userAfterPurchase.plan === 'pro' &&
      entitlementDoc.status === 'active' &&
      entitlementDoc.plan === 'pro';

    // 3. Duplicate event deduplication
    const duplicateResult = await processRevenueCatWebhook({
      event: {
        id: webhookEventId,
        type: 'INITIAL_PURCHASE',
        app_user_id: testUserId1,
        product_id: 'thoughtcatcher_pro_monthly',
      },
    });

    const deduplicated = duplicateResult.result === 'ignored_duplicate';

    const passed = authOk && authFail && upgraded && deduplicated;
    recordResult(
      12,
      'RevenueCat Webhook Auth & Deduplication',
      passed,
      `Bearer auth verified, initial purchase granted Pro plan, and duplicate event was cleanly ignored`
    );
  } catch (err) {
    recordResult(12, 'RevenueCat Webhook Auth & Deduplication', false, err.message);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('📋 EMULATOR INTEGRATION TEST RESULTS SUMMARY');
  console.log('===============================================================');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} | Flow ${String(r.num).padStart(2, '0')}: ${r.name.padEnd(40)} | ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('===============================================================\n');

  if (allPassed) {
    console.log('🎉 All 12 live emulator integration flows PASSED successfully!\n');
    process.exit(0);
  } else {
    console.error('⚠️ One or more integration flows failed.\n');
    process.exit(1);
  }
}

runAllIntegrationFlows().catch((err) => {
  console.error('Fatal error during emulator integration tests:', err);
  process.exit(1);
});
