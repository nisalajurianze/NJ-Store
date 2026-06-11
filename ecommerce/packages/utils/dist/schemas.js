import { z } from 'zod';
export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, 'Password must include uppercase, lowercase, number, and symbol');
export const phoneSchema = z
    .string()
    .trim()
    .regex(/^(?:\+94|0)(?:7\d|1\d|2\d|3\d|4\d|5\d|6\d|8\d|9\d)\d{7}$/, 'Enter a valid Sri Lankan phone number');
export const postalCodeSchema = z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Enter a valid Sri Lankan postal code');
export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');
export const imageAssetSchema = z.object({
    url: z.string().url(),
    publicId: z.string().min(1),
    alt: z.string().max(120).optional()
});
export const addressSchema = z.object({
    label: z.string().trim().min(2).max(30),
    fullName: z.string().trim().min(2).max(100),
    phone: phoneSchema,
    line1: z.string().trim().min(4).max(120),
    line2: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2).max(50),
    district: z.string().trim().min(2).max(50),
    postalCode: postalCodeSchema,
    country: z.string().trim().default('Sri Lanka'),
    isDefault: z.boolean().optional()
});
export const checkoutItemSchema = z.object({
    productId: objectIdSchema,
    quantity: z.number().int().min(1),
    variantIndex: z.number().int().min(0).optional()
});
export const shopFilterParamsSchema = z.object({
    q: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    brand: z.string().trim().min(1).optional(),
    condition: z.enum(['new', 'used']).optional(),
    minPrice: z.string().trim().min(1).optional(),
    maxPrice: z.string().trim().min(1).optional(),
    rating: z.string().trim().min(1).optional(),
    inStock: z.string().trim().min(1).optional(),
    bestSeller: z.string().trim().min(1).optional(),
    flashDeal: z.string().trim().min(1).optional(),
    sort: z.enum(['-createdAt', 'popular', 'price_asc', 'price_desc', 'rating']).optional()
});
export const shopFilterPresetSchema = z.object({
    params: shopFilterParamsSchema,
    savedAt: z.string().datetime()
});
