export const COLLECTIONS = {
  USERS: 'users',
  DEVICES: 'devices',
  CAPTURES: 'captures',
  ENRICHMENTS: 'enrichments',
  USAGE: 'usage',
  ENTITLEMENTS: 'entitlements',
  AUDIT_LOG: 'audit_log',
  PROCESSED_EVENTS: 'processed_events',
} as const;

export const DEFAULT_CONFIG = {
  FREE_TIER_DAILY_LIMIT: 2,
  FREE_TIER_WEEKLY_LIMIT: 10,
  GROQ_MODEL: 'openai/gpt-oss-120b',
  GROQ_TIMEOUT_MS: 15000,
  FIREBASE_REGION: 'asia-south1',
  DELETION_GRACE_PERIOD_DAYS: 7,
} as const;

export const MODEL_PRICING: Record<string, { promptCostPerMillion: number; completionCostPerMillion: number }> = {
  'openai/gpt-oss-120b': {
    promptCostPerMillion: 0.59,
    completionCostPerMillion: 0.79,
  },
  'llama-3.3-70b-versatile': {
    promptCostPerMillion: 0.59,
    completionCostPerMillion: 0.79,
  },
  'llama-3.1-70b-versatile': {
    promptCostPerMillion: 0.59,
    completionCostPerMillion: 0.79,
  },
  'llama-3.1-8b-instant': {
    promptCostPerMillion: 0.05,
    completionCostPerMillion: 0.08,
  },
};

export function estimateGroqCostUsd(
  model: string,
  promptTokens: number = 0,
  completionTokens: number = 0
): number {
  const pricing = MODEL_PRICING[model] || { promptCostPerMillion: 0.59, completionCostPerMillion: 0.79 };
  const promptCost = (promptTokens / 1_000_000) * pricing.promptCostPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionCostPerMillion;
  return Math.round((promptCost + completionCost) * 1_000_000) / 1_000_000;
}
