import { z } from 'zod';
import { addressSchema, imageAssetSchema } from '@njstore/utils';
export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');
export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10)
});
export { addressSchema, imageAssetSchema };
