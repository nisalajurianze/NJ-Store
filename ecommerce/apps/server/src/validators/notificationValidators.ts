import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from './commonValidators.js';

export const notificationsListQuerySchema = paginationQuerySchema;

export const notificationIdParamsSchema = z.object({
  id: objectIdSchema
});
