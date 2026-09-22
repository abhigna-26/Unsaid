export interface EnvironmentConfig {
  groqApiKey: string;
  groqModel: string;
  groqTimeoutMs: number;
  revenueCatWebhookSecret: string;
  freeTierDailyLimit: number;
  freeTierWeeklyLimit: number;
  enforceAppCheck: boolean;
  firebaseRegion: string;
  backupStorageBucket: string;
  isEmulator: boolean;
}

export function loadEnvConfig(): EnvironmentConfig {
  const isEmulator = Boolean(
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  );

  return {
    groqApiKey: process.env.GROQ_API_KEY || (isEmulator ? 'mock-groq-key' : ''),
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    groqTimeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS || '15000', 10),
    revenueCatWebhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET || (isEmulator ? 'test-rc-secret' : ''),
    freeTierDailyLimit: parseInt(process.env.FREE_TIER_DAILY_LIMIT || '2', 10),
    freeTierWeeklyLimit: parseInt(process.env.FREE_TIER_WEEKLY_LIMIT || '10', 10),
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
    firebaseRegion: process.env.FIREBASE_REGION || 'asia-south1',
    backupStorageBucket: process.env.BACKUP_STORAGE_BUCKET || 'thought-catcher-backups-prod',
    isEmulator,
  };
}

export const config = loadEnvConfig();
