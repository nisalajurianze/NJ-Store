import { z } from 'zod';

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().email(),
  source: z.string().trim().max(80).optional()
});

export const newsletterConfirmSchema = z.object({
  token: z.string().trim().min(10)
});
