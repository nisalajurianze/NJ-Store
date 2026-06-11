import { z } from 'zod';
import { objectIdSchema } from './commonValidators.js';
export const addToCartSchema = z.object({
    productId: objectIdSchema,
    quantity: z.number().int().min(1).max(20),
    variantIndex: z.number().int().min(0).optional()
});
export const updateCartItemSchema = z.object({
    quantity: z.number().int().min(1).max(20)
});
export const cartItemParamsSchema = z.object({
    itemId: objectIdSchema
});
export const syncCartSchema = z.object({
    items: z.array(z.object({
        productId: objectIdSchema,
        quantity: z.number().int().min(1).max(20),
        variantIndex: z.number().int().min(0).optional()
    }))
});
