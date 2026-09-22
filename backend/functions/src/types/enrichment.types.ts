import { Timestamp } from 'firebase-admin/firestore';

export type ThoughtType =
  | 'actionable_task'
  | 'idea'
  | 'journal'
  | 'meeting_note'
  | 'question'
  | 'reference';

export interface EnrichmentDoc {
  capture_id: string;
  title: string;
  type: ThoughtType;
  summary: string;
  tags: string[];
  model: string;
  created_at: Timestamp | string;
  updated_at: Timestamp | string;
  attempt_count: number;
  processing_duration_ms: number;
  failure_reason?: string | null;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
  estimated_cost_usd?: number | null;
}

export interface GroqEnrichmentOutput {
  title: string;
  type: ThoughtType;
  summary: string;
  tags: string[];
}

export interface GroqResponseResult {
  data: GroqEnrichmentOutput;
  model: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}
