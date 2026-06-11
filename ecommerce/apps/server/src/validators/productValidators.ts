import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from './commonValidators.js';

const booleanString = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'));

const imageAssetSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  alt: z.string().optional()
});

const isValidCanonicalUrl = (value: string): boolean => {
  if (!value) {
    return true;
  }

  if (value.startsWith('/')) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const canonicalUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || isValidCanonicalUrl(value), 'Enter a valid canonical URL or path like /product/item');

export const productQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  category: z
    .union([z.string().trim().max(200), z.array(z.string().trim().max(50))])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return Array.isArray(value) ? value : value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 10);
    }),
  brand: z
    .union([z.string().trim().max(200), z.array(z.string().trim().max(50))])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return Array.isArray(value) ? value : value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 10);
    }),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  condition: z.enum(['new', 'used']).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  inStock: booleanString.optional(),
  featured: booleanString.optional(),
  bestSeller: booleanString.optional(),
  flashDeal: booleanString.optional(),
  excludeIds: z
    .union([z.string().trim().max(2000), z.array(objectIdSchema)])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }

      return (Array.isArray(value) ? value : value.split(','))
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 50);
    }),
  sort: z.enum(['-createdAt', 'price_asc', 'price_desc', 'rating', 'popular']).optional()
});

export const suggestionsQuerySchema = z.object({
  q: z.string().trim().min(1).max(60)
});

export const productPriceRangeQuerySchema = productQuerySchema.omit({
  minPrice: true,
  maxPrice: true,
  page: true,
  limit: true
});

export const productUpsellQuerySchema = z
  .object({
    ids: z.string().trim().optional(),
    cartIds: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(8).optional()
  })
  .transform((value) => ({
    ids: (value.ids ?? value.cartIds ?? '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20),
    limit: value.limit
  }))
  .refine((value) => value.ids.length > 0, 'Provide at least one cart product id');

const variantSchema = z.object({
  color: z.string().trim().max(30).optional(),
  colorCode: z.string().trim().max(20).optional(),
  storage: z.string().trim().max(30).optional(),
  model: z.string().trim().max(40).optional(),
  attributes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        value: z.string().trim().min(1).max(80)
      })
    )
    .default([]),
  glowColor: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^#(?:[0-9A-Fa-f]{3}){1,2}$/.test(value), 'Use a valid hex code like #3B82F6'),
  images: z.array(imageAssetSchema).default([]),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0),
  sku: z.string().trim().min(2)
});

const specificationSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim().min(1)
});

const bundleItemSchema = z.object({
  product: objectIdSchema,
  quantity: z.number().int().min(1),
  variantIndex: z.number().int().min(0).optional()
});

const productPayloadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10),
  shortDescription: z.string().trim().min(10).max(500),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional(),
  category: objectIdSchema,
  brand: objectIdSchema.nullable().optional(),
  condition: z.enum(['new', 'used']).default('new'),
  images: z.array(imageAssetSchema).default([]),
  variants: z.array(variantSchema).default([]),
  specifications: z.array(specificationSchema).default([]),
  productType: z.enum(['standard', 'bundle']).default('standard'),
  bundleItems: z.array(bundleItemSchema).default([]),
  isBestSeller: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isFlashDeal: z.boolean().optional(),
  flashDealEndsAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string().trim()).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
  sku: z.string().trim().min(2),
  weight: z.number().min(0).optional(),
  metaTitle: z.string().trim().max(60).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  canonicalUrl: canonicalUrlSchema.optional(),
  publishAt: z.string().datetime().optional(),
  warranty: z.string().trim().max(120).optional(),
  videoUrl: z.string().trim().url().optional()
});

export const createProductSchema = productPayloadSchema
  .refine((value) => !value.isFlashDeal || (value.comparePrice !== undefined && value.comparePrice > value.price), {
    message: 'Flash deals require a compare price greater than the active price',
    path: ['comparePrice']
  })
  .refine((value) => value.productType === 'bundle' || value.variants.length > 0, {
    message: 'Add at least one variant to standard products',
    path: ['variants']
  })
  .refine((value) => value.productType === 'standard' || value.bundleItems.length > 0, {
    message: 'Add at least one product to the bundle',
    path: ['bundleItems']
  })
  .refine((value) => !value.flashDealEndsAt || Number.isNaN(new Date(value.flashDealEndsAt).getTime()) === false, {
    message: 'Enter a valid flash deal end date',
    path: ['flashDealEndsAt']
  })
  .refine((value) => !value.flashDealEndsAt || new Date(value.flashDealEndsAt).getTime() > Date.now(), {
    message: 'Flash deal end date must be in the future',
    path: ['flashDealEndsAt']
  })
  .refine((value) => !value.publishAt || Number.isNaN(new Date(value.publishAt).getTime()) === false, {
    message: 'Enter a valid publish date',
    path: ['publishAt']
  });

export const updateProductSchema = productPayloadSchema.partial().extend({
  brand: objectIdSchema.nullable().optional(),
  comparePrice: z.number().min(0).nullable().optional(),
  canonicalUrl: canonicalUrlSchema.nullable().optional(),
  flashDealEndsAt: z.string().datetime().nullable().optional(),
  metaTitle: z.string().trim().max(60).nullable().optional(),
  metaDescription: z.string().trim().max(160).nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
  videoUrl: z.string().trim().url().nullable().optional(),
  warranty: z.string().trim().max(120).nullable().optional(),
  weight: z.number().min(0).nullable().optional()
});
export const productIdParamsSchema = z.object({ id: objectIdSchema });
export const productSlugParamsSchema = z.object({ slug: z.string().trim().min(1) });

export const compareQuerySchema = z.object({
  ids: z.string().trim().min(1).transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 4))
});

export const compareBodySchema = z.object({
  items: z.array(objectIdSchema).max(4)
});

export const productQuestionSchema = z.object({
  customerName: z.string().trim().min(2).max(100).optional(),
  customerEmail: z.string().trim().email().max(120).optional(),
  question: z.string().trim().min(10).max(1500)
});

export const backInStockSubscriptionSchema = z.object({
  email: z.string().trim().email().max(120),
  name: z.string().trim().min(2).max(100).optional(),
  variantIndex: z.number().int().min(0).optional()
});

export const productUpsellSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        quantity: z.coerce.number().int().min(1).max(20).optional(),
        variantIndex: z.coerce.number().int().min(0).optional()
      })
    )
    .min(1)
    .max(20),
  limit: z.coerce.number().int().min(1).max(12).optional()
});
