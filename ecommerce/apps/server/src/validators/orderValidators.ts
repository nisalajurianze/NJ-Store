import { z } from 'zod';
import { checkoutItemSchema } from '@njstore/utils';
import { addressSchema, objectIdSchema, paginationQuerySchema } from './commonValidators.js';

const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalMoneySchema = z.coerce.number().min(0).optional();
const optionalLoyaltyPointsSchema = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().int().min(0).optional()
);

export const adminOrderCreateSchema = z
  .object({
    customerId: z.preprocess(emptyStringToUndefined, objectIdSchema.optional()),
    customerName: z.string().trim().min(2).max(100),
    customerEmail: z.string().trim().email().max(180),
    customerPhone: z.preprocess(emptyStringToUndefined, z.string().trim().max(30).optional()),
    items: z.array(checkoutItemSchema).min(1),
    paymentMethod: z.enum(['bank_transfer', 'cash_on_delivery']).default('bank_transfer'),
    type: z.enum(['delivery', 'pickup']).default('delivery'),
    shippingAddress: addressSchema.optional(),
    pickupSlot: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
    deliveryNotes: z.preprocess(emptyStringToUndefined, z.string().trim().max(500).optional()),
    notes: z.preprocess(emptyStringToUndefined, z.string().trim().max(500).optional()),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered']).default('pending'),
    paymentStatus: z.enum(['unpaid', 'paid']).default('unpaid'),
    trackingNumber: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
    assignedToId: z.preprocess(emptyStringToUndefined, objectIdSchema.nullable().optional()),
    shippingFee: optionalMoneySchema,
    discount: optionalMoneySchema,
    taxAmount: optionalMoneySchema,
    taxLabel: z.preprocess(emptyStringToUndefined, z.string().trim().max(40).optional()),
    taxRate: z.coerce.number().min(0).max(100).optional()
  })
  .superRefine((data, ctx) => {
    if (data.type === 'delivery' && !data.shippingAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shippingAddress'],
        message: 'Shipping address is required'
      });
    }

    if (data.status === 'shipped' && !data.trackingNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trackingNumber'],
        message: 'Tracking number is required before marking shipped'
      });
    }
  });

export const createQuotationSchema = z
  .object({
    items: z.array(checkoutItemSchema).min(1),
    paymentMethod: z.enum(['bank_transfer', 'cash_on_delivery']).optional(),
    type: z.enum(['delivery', 'pickup']).optional(),
    addressId: z.preprocess(emptyStringToUndefined, objectIdSchema.optional()),
    shippingAddress: addressSchema.optional(),
    pickupSlot: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
    deliveryNotes: z.preprocess(emptyStringToUndefined, z.string().trim().max(500).optional()),
    notes: z.preprocess(emptyStringToUndefined, z.string().trim().max(500).optional()),
    couponCode: z.preprocess(emptyStringToUndefined, z.string().trim().max(32).optional()),
    loyaltyPointsToRedeem: optionalLoyaltyPointsSchema
  })
  .superRefine((data, ctx) => {
    if (data.type === 'delivery' && !data.shippingAddress && !data.addressId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['addressId'],
        message: 'Shipping address is required'
      });
    }
  });

export const confirmQuotationParamsSchema = z.object({
  token: z.string().min(10)
});

export const confirmQuotationBodySchema = z.preprocess(
  (value) => value ?? {},
  z
    .object({
      paymentMethod: z.enum(['bank_transfer', 'cash_on_delivery']).optional(),
      type: z.enum(['delivery', 'pickup']).optional(),
      addressId: z.preprocess(emptyStringToUndefined, objectIdSchema.optional()),
      shippingAddress: addressSchema.optional(),
      pickupSlot: z.preprocess(emptyStringToUndefined, z.string().trim().max(120).optional()),
      deliveryNotes: z.preprocess(emptyStringToUndefined, z.string().trim().max(500).optional()),
      loyaltyPointsToRedeem: optionalLoyaltyPointsSchema
    })
    .superRefine((data, ctx) => {
      if (data.type === 'delivery' && !data.shippingAddress && !data.addressId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['addressId'],
          message: 'Shipping address is required'
        });
      }
    })
);

export const orderIdParamsSchema = z.object({
  id: objectIdSchema
});

export const orderReceiptParamsSchema = z.object({
  id: objectIdSchema,
  receiptId: objectIdSchema
});

export const orderListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(['createdAt', 'activity']).default('createdAt')
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['unpaid', 'receipt_uploaded', 'paid', 'rejected']).optional(),
  trackingNumber: z.string().trim().max(120).optional(),
  assignedToId: objectIdSchema.nullable().optional(),
  reason: z.string().trim().max(300).optional()
});

export const adminOrderMergeSchema = z
  .object({
    keepOrderId: objectIdSchema,
    mergeOrderId: objectIdSchema,
    reason: z.string().trim().max(300).optional()
  })
  .refine((value) => value.keepOrderId !== value.mergeOrderId, {
    message: 'Choose two different orders to merge',
    path: ['mergeOrderId']
  });

export const adminOrderQuerySchema = paginationQuerySchema.extend({
  status: z.string().trim().optional(),
  paymentStatus: z.string().trim().optional(),
  search: z.string().trim().max(60).optional()
});
