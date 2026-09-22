/**
 * Thought Catcher Backend - Cloud Functions Entry Point
 */

// 1. AI Enrichment
export { requestEnrichment } from './functions/enrichment';

// 2. RevenueCat Webhook
export { revenueCatWebhook } from './functions/revenuecat';

// 3. Account Deletion & Scheduled Retention Cascade
export { requestAccountDeletion } from './functions/accountDeletion';
export { scheduledHardDeletion } from './functions/scheduledDeletion';

// 4. Data Export
export { exportUserData } from './functions/dataExport';

// 5. Device Migration
export { migrateDeviceCaptures } from './functions/migration';

// 6. Safe System Health Check
export { health } from './functions/health';
