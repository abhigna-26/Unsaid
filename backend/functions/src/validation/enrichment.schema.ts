import { z } from 'zod';

export const RequestEnrichmentSchema = z.object({
  capture_id: z.string().min(1, 'Capture ID is required').max(128),
  force_retry: z.boolean().optional(),
});

export const GroqOutputSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  type: z.enum(['actionable_task', 'idea', 'journal', 'meeting_note', 'question', 'reference']),
  summary: z.string().min(1, 'Summary required').max(2000),
  tags: z.array(z.string().min(1).max(50)).min(1).max(10),
});
