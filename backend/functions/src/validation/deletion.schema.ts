import { z } from 'zod';

export const RequestAccountDeletionSchema = z.object({
  confirm: z.boolean().optional(),
});
