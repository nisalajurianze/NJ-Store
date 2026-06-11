import { z } from 'zod';
import { passwordSchema, phoneSchema, shopFilterPresetSchema } from '@njstore/utils';
import { addressSchema, objectIdSchema } from './commonValidators.js';

const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  phoneSchema.optional()
);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: passwordSchema,
  phone: optionalPhoneSchema,
  language: z.enum(['en', 'si']).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false)
});

export const googleLoginSchema = z.object({
  credential: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
  workspaceAccess: z.boolean().optional().default(false)
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

export const tokenSchema = z.object({
  token: z.string().min(10)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: optionalPhoneSchema,
  language: z.enum(['en', 'si']).optional(),
  shopPreferences: z
    .object({
      myFilters: z.union([shopFilterPresetSchema, z.null()]).optional()
    })
    .optional()
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});

export const addressPayloadSchema = addressSchema;
export const addressIdParamsSchema = z.object({ addressId: objectIdSchema });
