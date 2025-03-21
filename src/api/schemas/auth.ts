import { z } from 'zod';

/**
 * Token validation schema
 * Used for validating tokens in the validate-token endpoint
 */
export const tokenValidationSchema = z.object({
  token: z.string().min(1, "Token is required")
}); 