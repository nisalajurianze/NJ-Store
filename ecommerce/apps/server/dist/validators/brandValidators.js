import { z } from 'zod';
import { paginationQuerySchema } from './commonValidators.js';
import { objectIdSchema } from './commonValidators.js';
export const publicBrandQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().max(120).optional(),
    sort: z.enum(['name', 'sortOrder']).optional()
});
export const brandIdParamsSchema = z.object({
    id: objectIdSchema
});
export const brandSlugParamsSchema = z.object({
    slug: z.string().trim().min(1).max(160)
});
