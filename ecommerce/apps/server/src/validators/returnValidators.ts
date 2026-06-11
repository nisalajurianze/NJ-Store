import { z } from 'zod';
import { returnRequestStatuses } from '@njstore/types';
import { objectIdSchema, paginationQuerySchema } from './commonValidators.js';

const mutableReturnStatuses = ['approved', 'rejected', 'refunded'] as const;

const returnRequestItemSchema = z.object({
  sku: z.string().trim().min(1).max(120),
  variantIndex: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1)
});

export const createReturnRequestSchema = z.object({
  reason: z.string().trim().min(10).max(1_000),
  items: z.array(returnRequestItemSchema).min(1).max(50).optional(),
  refundAmount: z.number().min(0).optional(),
  refundPercent: z.number().min(0).max(100).optional()
});

export const adminReturnRequestQuerySchema = paginationQuerySchema.extend({
  status: z.enum(returnRequestStatuses).optional(),
  search: z.string().trim().max(60).optional()
});

export const adminReturnRequestUpdateSchema = z.object({
  status: z.enum(mutableReturnStatuses),
  adminNote: z.string().trim().max(1_000).optional(),
  items: z.array(returnRequestItemSchema).min(1).max(50).optional(),
  refundAmount: z.number().min(0).optional(),
  refundPercent: z.number().min(0).max(100).optional()
});

export const returnEvidenceParamsSchema = z.object({
  id: objectIdSchema,
  returnId: objectIdSchema
});
