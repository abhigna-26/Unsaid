const path = require('path');
const functionsDir = path.resolve(__dirname, '../functions');
module.paths.push(path.join(functionsDir, 'node_modules'));

const admin = require('firebase-admin');

// Initialize Firebase Admin for Emulator Seeding
if (admin.apps.length === 0) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  admin.initializeApp({ projectId: 'thought-catcher-app' });
}

const db = admin.firestore();
const auth = admin.auth();

async function seedEmulatorData() {
  console.log('🌱 Seeding local Firebase emulator data...');

  const now = admin.firestore.Timestamp.now();

  // 1. Seed Free User
  const freeUid = 'test-free-user-uid';
  try {
    await auth.createUser({
      uid: freeUid,
      email: 'free@thoughtcatcher.app',
      displayName: 'Free Tier User',
      password: 'password123',
    });
  } catch {
    console.log('User already exists in Auth');
  }

  await db.collection('users').doc(freeUid).set({
    uid: freeUid,
    email: 'free@thoughtcatcher.app',
    display_name: 'Free Tier User',
    plan: 'free',
    account_status: 'active',
    created_at: now,
    updated_at: now,
  });

  // 2. Seed Pro User
  const proUid = 'test-pro-user-uid';
  try {
    await auth.createUser({
      uid: proUid,
      email: 'pro@thoughtcatcher.app',
      displayName: 'Pro Subscriber',
      password: 'password123',
    });
  } catch {
    console.log('Pro user already exists in Auth');
  }

  await db.collection('users').doc(proUid).set({
    uid: proUid,
    email: 'pro@thoughtcatcher.app',
    display_name: 'Pro Subscriber',
    plan: 'pro',
    revenuecat_customer_id: 'rc_cust_123',
    account_status: 'active',
    created_at: now,
    updated_at: now,
  });

  await db.collection('entitlements').doc(proUid).set({
    uid: proUid,
    plan: 'pro',
    status: 'active',
    revenuecat_customer_id: 'rc_cust_123',
    entitlement_id: 'pro',
    product_id: 'thoughtcatcher_pro_monthly',
    expires_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    updated_at: now,
  });

  // 3. Seed Sample Captures
  const sampleCaptureId = 'cap-seed-111-222-333';
  await db.collection('captures').doc(sampleCaptureId).set({
    id: sampleCaptureId,
    user_id: freeUid,
    text: 'Schedule product design sprint review with the frontend team next Tuesday',
    created_at: now,
    updated_at: now,
    enrichment_status: 'pending',
    deleted_at: null,
  });

  console.log('✅ Local emulator seeding complete.');
}

if (require.main === module) {
  seedEmulatorData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedEmulatorData };
