import { getCaptureById, updateCaptureEnrichmentStatus } from '../repositories/capture.repository';
import { saveEnrichment, getEnrichmentByCaptureId } from '../repositories/enrichment.repository';
import { reserveEnrichmentQuota, refundEnrichmentQuota } from './quota.service';
import { enrichThoughtWithGroq } from './groq.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { toFirestoreTimestamp } from '../utils/timestamps';
import { EnrichmentDoc, GroqEnrichmentOutput } from '../types/enrichment.types';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ProcessEnrichmentResult {
  success: boolean;
  capture_id: string;
  status: 'done' | 'failed' | 'processing';
  enrichment?: GroqEnrichmentOutput;
  error?: string;
}

export async function processEnrichmentRequest(
  userId: string,
  captureId: string,
  forceRetry = false
): Promise<ProcessEnrichmentResult> {
  const startTime = Date.now();

  const capture = await getCaptureById(captureId);
  if (!capture) {
    throw new AppError('RESOURCE_NOT_FOUND', `Capture with ID ${captureId} not found.`);
  }

  if (capture.user_id !== userId) {
    throw new AppError('PERMISSION_DENIED', 'You do not have permission to enrich this capture.');
  }

  if (capture.enrichment_status === 'done' && !forceRetry) {
    const existing = await getEnrichmentByCaptureId(captureId);
    if (existing) {
      return {
        success: true,
        capture_id: captureId,
        status: 'done',
        enrichment: {
          title: existing.title,
          type: existing.type,
          summary: existing.summary,
          tags: existing.tags,
        },
      };
    }
  }

  await reserveEnrichmentQuota(userId);
  await updateCaptureEnrichmentStatus(captureId, 'processing');

  let attemptCount = 1;
  let groqResult;

  try {
    try {
      groqResult = await enrichThoughtWithGroq(capture.text);
    } catch (firstErr) {
      logger.warn(`First Groq enrichment attempt failed for capture ${captureId}. Retrying with backoff...`, {
        error: firstErr instanceof Error ? firstErr.message : String(firstErr),
      });

      attemptCount = 2;
      await sleep(1200);
      groqResult = await enrichThoughtWithGroq(capture.text);
    }

    const now = toFirestoreTimestamp();
    const enrichmentDoc: EnrichmentDoc = {
      capture_id: captureId,
      title: groqResult.data.title,
      type: groqResult.data.type,
      summary: groqResult.data.summary,
      tags: groqResult.data.tags,
      model: groqResult.model,
      created_at: now,
      updated_at: now,
      attempt_count: attemptCount,
      processing_duration_ms: Date.now() - startTime,
      failure_reason: null,
      token_usage: {
        prompt_tokens: groqResult.promptTokens,
        completion_tokens: groqResult.completionTokens,
        total_tokens: groqResult.totalTokens,
      },
      estimated_cost_usd: groqResult.estimatedCostUsd,
    };

    await saveEnrichment(enrichmentDoc);
    await updateCaptureEnrichmentStatus(captureId, 'done');

    logger.info('Thought enriched successfully', {
      captureId,
      userId,
      model: groqResult.model,
      durationMs: enrichmentDoc.processing_duration_ms,
      totalTokens: groqResult.totalTokens,
      costUsd: groqResult.estimatedCostUsd,
    });

    return {
      success: true,
      capture_id: captureId,
      status: 'done',
      enrichment: groqResult.data,
    };
  } catch (err) {
    await refundEnrichmentQuota(userId);
    await updateCaptureEnrichmentStatus(captureId, 'failed');

    const failureReason = err instanceof Error ? err.message : 'Unknown AI processing error';

    const failedDoc: EnrichmentDoc = {
      capture_id: captureId,
      title: 'Enrichment Failed',
      type: 'reference',
      summary: 'Automatic enrichment failed. You can retry enrichment manually.',
      tags: [],
      model: 'none',
      created_at: toFirestoreTimestamp(),
      updated_at: toFirestoreTimestamp(),
      attempt_count: attemptCount,
      processing_duration_ms: Date.now() - startTime,
      failure_reason: failureReason,
      token_usage: null,
      estimated_cost_usd: 0,
    };

    await saveEnrichment(failedDoc);

    logger.error('Enrichment failed permanently after retry', {
      captureId,
      userId,
      attemptCount,
      error: failureReason,
    });

    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError('AI_SERVICE_ERROR', 'AI enrichment failed. Your quota has not been charged. Please retry later.');
  }
}
