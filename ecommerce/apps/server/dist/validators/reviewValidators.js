import { z } from 'zod';
import { objectIdSchema } from './commonValidators.js';
export const createReviewSchema = z.object({
    product: objectIdSchema,
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().min(2).max(100),
    comment: z.string().trim().min(10).max(2000)
});
export const reviewIdParamsSchema = z.object({
    id: objectIdSchema
});
export const reviewProductParamsSchema = z.object({
    productId: objectIdSchema
});
