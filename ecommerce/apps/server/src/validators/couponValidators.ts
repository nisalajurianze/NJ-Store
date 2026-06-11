import { z } from 'zod';
import { objectIdSchema } from './commonValidators.js';

export const applyCouponSchema = z.object({
  code: z.string().trim().max(32).optional(),
  subtotal: z.number().min(0),
  shippingFee: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        quantity: z.number().int().min(1),
        variantIndex: z.number().int().min(0).optional()
      })
    )
    .min(1)
    .optional()
});
