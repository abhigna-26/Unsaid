import { processEnrichmentRequest } from '../services/enrichment.service';
import * as captureRepo from '../repositories/capture.repository';
import * as enrichmentRepo from '../repositories/enrichment.repository';
import * as quotaService from '../services/quota.service';
import * as groqService from '../services/groq.service';
import { CaptureDoc } from '../types/capture.types';

jest.mock('../repositories/capture.repository');
jest.mock('../repositories/enrichment.repository');
jest.mock('../services/quota.service');
jest.mock('../services/groq.service');

describe('AI Enrichment Service Pipeline', () => {
  const mockCapture: CaptureDoc = {
    id: 'cap_123',
    user_id: 'user_abc',
    text: 'Need to prepare the presentation slides for Monday team sync regarding Q3 roadmap',
    enrichment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (captureRepo.getCaptureById as jest.Mock).mockResolvedValue(mockCapture);
    (quotaService.reserveEnrichmentQuota as jest.Mock).mockResolvedValue({
      isPro: false,
      dailyCount: 1,
      weeklyCount: 1,
    });
    (captureRepo.updateCaptureEnrichmentStatus as jest.Mock).mockResolvedValue(undefined);
    (enrichmentRepo.saveEnrichment as jest.Mock).mockResolvedValue(undefined);
    (enrichmentRepo.getEnrichmentByCaptureId as jest.Mock).mockResolvedValue(null);
  });

  it('should successfully enrich a capture and update status to done', async () => {
    (groqService.enrichThoughtWithGroq as jest.Mock).mockResolvedValueOnce({
      data: {
        title: 'Q3 Roadmap Presentation Slides',
        type: 'actionable_task',
        summary: 'Prepare presentation deck for Monday team sync on Q3 roadmap goals.',
        tags: ['presentation', 'roadmap', 'sync', 'q3'],
      },
      model: 'openai/gpt-oss-120b',
      durationMs: 450,
      promptTokens: 40,
      completionTokens: 25,
      totalTokens: 65,
      estimatedCostUsd: 0.000043,
    });

    const response = await processEnrichmentRequest('user_abc', 'cap_123');

    expect(response.success).toBe(true);
    expect(response.status).toBe('done');
    expect(response.enrichment?.title).toBe('Q3 Roadmap Presentation Slides');
    expect(response.enrichment?.type).toBe('actionable_task');
    expect(captureRepo.updateCaptureEnrichmentStatus).toHaveBeenCalledWith('cap_123', 'done');
    expect(enrichmentRepo.saveEnrichment).toHaveBeenCalled();
  });

  it('should reject unauthorized user attempting to enrich another user capture', async () => {
    await expect(processEnrichmentRequest('unauthorized_user', 'cap_123')).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('should refund quota and mark failed if Groq fails permanently', async () => {
    (groqService.enrichThoughtWithGroq as jest.Mock)
      .mockRejectedValueOnce(new Error('Groq network error'))
      .mockRejectedValueOnce(new Error('Groq network error retry failed'));

    await expect(processEnrichmentRequest('user_abc', 'cap_123')).rejects.toMatchObject({
      code: 'AI_SERVICE_ERROR',
    });

    expect(quotaService.refundEnrichmentQuota).toHaveBeenCalledWith('user_abc');
    expect(captureRepo.updateCaptureEnrichmentStatus).toHaveBeenCalledWith('cap_123', 'failed');
    expect(enrichmentRepo.saveEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({
        capture_id: 'cap_123',
        failure_reason: expect.stringContaining('Groq network error retry failed'),
      })
    );
  });
});
