import { z } from 'zod';

export const ExportUserDataSchema = z.object({
  format: z.enum(['json']).optional().default('json'),
});
