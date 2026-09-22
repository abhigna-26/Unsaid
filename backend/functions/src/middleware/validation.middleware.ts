import { z } from 'zod';
import { AppError } from '../utils/errors';

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new AppError('INVALID_ARGUMENT', `Validation error: ${errorDetails}`, result.error.format());
  }
  return result.data;
}
