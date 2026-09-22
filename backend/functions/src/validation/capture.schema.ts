import { z } from 'zod';

export const SaveCaptureSchema = z.object({
  id: z.string().min(1).max(128),
  text: z.string().min(1, 'Text cannot be empty').max(20000, 'Text exceeds 20,000 characters limit'),
  voice_transcript_reference: z.string().max(512).nullable().optional(),
  device_id: z.string().max(128).nullable().optional(),
});

export const MigrateDeviceCapturesSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required').max(128),
  capture_ids: z.array(z.string().min(1).max(128)).min(1, 'At least one capture ID is required').max(500),
});
