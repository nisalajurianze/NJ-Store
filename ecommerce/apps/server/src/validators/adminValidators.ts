import { adminPermissions } from '@njstore/types';
import { z } from 'zod';
import { imageAssetSchema, objectIdSchema, paginationQuerySchema } from './commonValidators.js';
import { isAllowedMapEmbedUrl } from '../utils/footerDefaults.js';

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  metaTitle: z.string().trim().max(60).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  image: z.object({ url: z.string().url(), publicId: z.string().min(1), alt: z.string().optional() }).optional(),
  parent: objectIdSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional()
});

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(120),
  logo: imageAssetSchema.optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional()
});

export const brandListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  sort: z.enum(['name', 'sortOrder']).optional(),
  includeInactive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))
});

const commaSeparatedObjectIdsSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return undefined;
  },
  z.array(objectIdSchema).max(100).optional()
);

export const adminProductListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  inventory: z.enum(['all', 'low_stock']).optional(),
  ids: commaSeparatedObjectIdsSchema,
  includeInactive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))
});

export const analyticsQuerySchema = z
  .object({
    period: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
  })
  .superRefine((value, ctx) => {
    if (value.period !== 'custom') {
      return;
    }

    if (!value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom analytics requires a start date.',
        path: ['startDate']
      });
    }

    if (!value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom analytics requires an end date.',
        path: ['endDate']
      });
    }

    if (!value.startDate || !value.endDate) {
      return;
    }

    if (value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom analytics start date must be on or before the end date.',
        path: ['startDate']
      });
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (value.endDate > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom analytics cannot end in the future.',
        path: ['endDate']
      });
    }

    const rangeDays = Math.floor((value.endDate.getTime() - value.startDate.getTime()) / 86_400_000) + 1;
    if (rangeDays > 366) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom analytics range can span up to 366 days.',
        path: ['endDate']
      });
    }
  });

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(20),
  type: z.enum(['percentage', 'fixed', 'free_shipping', 'bogo']),
  value: z.number().min(0),
  minOrderValue: z.number().min(0).nullable().optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  restrictToEmail: z.string().trim().email().max(120).nullable().optional(),
  appliesToCategories: z.array(objectIdSchema).max(25).optional(),
  appliesToBrands: z.array(objectIdSchema).max(25).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  isFirstOrderOnly: z.boolean().optional(),
  autoApply: z.boolean().optional(),
  bogo: z
    .object({
      buyQuantity: z.number().int().min(1),
      getQuantity: z.number().int().min(1)
    })
    .nullable()
    .optional(),
  expiryDate: z.coerce.date(),
  usageLimit: z.number().int().min(1),
  isActive: z.boolean().optional()
});

export const userUpdateSchema = z.object({
  role: z.enum(['customer', 'staff', 'admin']).optional(),
  isActive: z.boolean().optional(),
  permissions: z
    .array(z.enum(adminPermissions))
    .max(adminPermissions.length)
    .optional()
});

export const userMergeSchema = z
  .object({
    keepUserId: objectIdSchema,
    mergeUserId: objectIdSchema
  })
  .superRefine((value, ctx) => {
    if (value.keepUserId === value.mergeUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose two different user accounts to merge.',
        path: ['mergeUserId']
      });
    }
  });

export const idParamsSchema = z.object({
  id: objectIdSchema
});

export const productVersionParamsSchema = z.object({
  id: objectIdSchema,
  versionId: objectIdSchema
});

export const productVersionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional()
});

export const adminProductQuestionQuerySchema = z.object({
  status: z.enum(['pending', 'answered']).optional(),
  search: z.string().trim().max(120).optional()
});

export const adminProductQuestionAnswerSchema = z.object({
  answer: z.string().trim().min(5).max(2000)
});

export const bulkProductPriceAdjustSchema = z.object({
  productIds: z.array(objectIdSchema).min(1).max(100),
  adjustmentType: z.enum(['percentage', 'fixed']),
  amount: z.number().refine((value) => value !== 0, 'Adjustment amount cannot be zero'),
  target: z.enum(['price', 'comparePrice', 'both']).default('price'),
  applyToVariantOverrides: z.boolean().optional()
});

const notificationChannelSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean()
});

const urlOrEmptySchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().url('Enter a valid URL').or(z.literal(''))
);

const mapEmbedUrlSchema = urlOrEmptySchema.refine((value) => value === '' || isAllowedMapEmbedUrl(value), {
  message: 'Map embed URL must be a Google Maps HTTPS embed URL that includes /maps/embed or output=embed.'
});

const optionalShortTextSchema = (max: number) =>
  z.preprocess((value) => (typeof value === 'string' ? value.trim() : value), z.string().max(max).or(z.literal('')).optional());

const socialLinksSchema = z.object({
  facebook: urlOrEmptySchema,
  instagram: urlOrEmptySchema,
  tiktok: urlOrEmptySchema,
  youtube: urlOrEmptySchema,
  x: urlOrEmptySchema
});

const supportedCurrenciesSchema = z
  .array(
    z.object({
      code: z.string().trim().toUpperCase().length(3),
      symbol: z.string().trim().min(1).max(8),
      rate: z.number().min(0.0001),
      isDefault: z.boolean().optional()
    })
  )
  .min(1)
  .max(6)
  .superRefine((currencies, ctx) => {
    const defaultCount = currencies.filter((currency) => currency.isDefault).length;
    if (defaultCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose exactly one default currency.',
        path: ['isDefault']
      });
    }

    if (!currencies.some((currency) => currency.code === 'LKR')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'LKR must remain available as the base store currency.',
        path: ['code']
      });
    }

    const seen = new Set<string>();
    currencies.forEach((currency, index) => {
      if (seen.has(currency.code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each currency code must be unique.',
          path: [index, 'code']
        });
      }
      seen.add(currency.code);

      if (currency.code === 'LKR' && currency.rate !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'LKR must always use an exchange rate of 1.',
          path: [index, 'rate']
        });
      }
    });
  });

export const settingsSchema = z.object({
  revision: z.number().int().min(0).optional(),
  storeName: z.string().trim().min(2).max(120).optional(),
  storeLogo: imageAssetSchema.nullable().optional(),
  storeLogoDark: imageAssetSchema.nullable().optional(),
  storeLogoLight: imageAssetSchema.nullable().optional(),
  supportPhoneNumber: z
    .string()
    .trim()
    .min(7)
    .max(25)
    .regex(/^\+?[0-9()\-\s]+$/, 'Enter a valid support phone number')
    .optional(),
  whatsappNumber: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^\+?[0-9()\-\s]+$/, 'Enter a valid WhatsApp number')
    .optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  shippingRates: z
    .array(
      z.object({
        city: z.string().trim().min(2),
        fee: z.number().min(0),
        days: z.string().trim().min(1)
      })
    )
    .optional(),
  loyaltyPointsRate: z.number().min(1).optional(),
  cancellationWindowHours: z.number().min(0).optional(),
  quotationExpiryDays: z.number().min(1).optional(),
  cashOnDeliveryEnabled: z.boolean().optional(),
  bankTransferDetails: z
    .object({
      accountName: z.string().trim().min(2),
      bankName: z.string().trim().min(2),
      branch: z.string().trim().min(2),
      accountNumber: z.string().trim().min(4)
    })
    .optional(),
  socialLinks: socialLinksSchema.optional(),
  footer: z
    .object({
      companyName: z.string().trim().min(2).max(120),
      logo: imageAssetSchema.nullable().optional(),
      description: z.string().trim().min(8).max(280),
      email: z.string().trim().email().max(120),
      phone: z
        .string()
        .trim()
        .min(7)
        .max(25)
        .regex(/^\+?[0-9()\-\s]+$/, 'Enter a valid footer phone number'),
      whatsappNumber: z
        .string()
        .trim()
        .min(8)
        .max(20)
        .regex(/^\+?[0-9()\-\s]+$/, 'Enter a valid WhatsApp number'),
      physicalAddress: z.string().trim().min(8).max(220),
      mapEmbedUrl: mapEmbedUrlSchema,
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
      openingHours: optionalShortTextSchema(120),
      copyrightText: z.string().trim().min(4).max(160),
      socialLinks: socialLinksSchema,
      sectionTitles: z.object({
        about: z.string().trim().min(2).max(40),
        quickLinks: z.string().trim().min(2).max(40),
        contact: z.string().trim().min(2).max(40),
        social: z.string().trim().min(2).max(40)
      }),
      quickLinks: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(40),
            href: z.string().trim().min(1).max(180)
          })
        )
        .min(1)
        .max(8)
    })
    .superRefine((value, ctx) => {
      const hasLatitude = typeof value.latitude === 'number';
      const hasLongitude = typeof value.longitude === 'number';

      if (hasLatitude !== hasLongitude) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide both latitude and longitude or leave both blank.',
          path: [hasLatitude ? 'longitude' : 'latitude']
        });
      }
    })
    .optional(),
  supportedCurrencies: supportedCurrenciesSchema.optional(),
  maintenanceMode: z
    .object({
      enabled: z.boolean(),
      message: z.string().trim().min(8).max(240)
    })
    .optional(),
  taxSettings: z
    .object({
      enabled: z.boolean(),
      label: z.string().trim().min(2).max(32),
      rate: z.number().min(0).max(100)
    })
    .optional(),
  notificationSettings: z
    .object({
      quotationReady: notificationChannelSettingsSchema,
      orderConfirmed: notificationChannelSettingsSchema,
      orderShipped: notificationChannelSettingsSchema,
      receiptRejected: notificationChannelSettingsSchema,
      lowStockAlert: notificationChannelSettingsSchema
    })
    .optional(),
  emailTemplates: z
    .array(
      z.object({
        type: z.string().trim().min(2),
        subject: z.string().trim().min(2),
        bodyHtml: z.string().trim().min(2)
      })
    )
    .optional()
});

export const footerSettingsSchema = settingsSchema.shape.footer.unwrap();

const bannerMediaSchema = z.object({
  kind: z.enum(['image', 'video']),
  url: z.string().url(),
  publicId: z.string().trim().min(1),
  alt: z.string().trim().max(180).optional(),
  poster: z
    .object({
      url: z.string().url(),
      publicId: z.string().trim().min(1),
      alt: z.string().trim().max(180).optional()
    })
    .optional()
});

const bannerMediaArraySchema = z.array(bannerMediaSchema).max(6);
const showcaseFeatureIconSchema = z.enum(['camera', 'memory', 'storage', 'battery', 'display', 'chip', 'audio', 'connectivity']);
const showcaseFeatureItemSchema = z.object({
  icon: showcaseFeatureIconSchema,
  label: z.string().trim().min(2).max(60),
  value: z.string().trim().min(1).max(80)
});
const showcaseFeatureGroupSchema = z.object({
  productId: z.string().trim().min(1),
  items: z.array(showcaseFeatureItemSchema).max(4)
});

const homeAdSlotSchema = z
  .object({
    slotKey: z.enum(['slot-1', 'slot-2', 'slot-3']),
    eyebrow: z.string().trim().max(60).optional(),
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(220).optional(),
    ctaUrl: z.string().trim().max(180).optional(),
    mediaItems: bannerMediaArraySchema.optional(),
    isActive: z.boolean()
  })
  .superRefine((value, ctx) => {
    const hasTitle = Boolean(value.title?.trim());
    const hasDescription = Boolean(value.description?.trim());
    const hasMedia = Boolean(value.mediaItems?.length);
    const hasCtaUrl = Boolean(value.ctaUrl?.trim());

    if ((value.isActive || hasDescription || hasMedia || hasCtaUrl) && !hasTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Active advertisement slots need a title.',
        path: ['title']
      });
    }

    if (hasCtaUrl && !value.ctaUrl?.startsWith('/')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ad click URL must start with "/".',
        path: ['ctaUrl']
      });
    }
  });

const homeFeaturePromoSchema = z
  .object({
    eyebrow: z.string().trim().max(60).optional(),
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(320).optional(),
    ctaText: z.string().trim().max(80).optional(),
    ctaUrl: z.string().trim().max(180).optional(),
    secondaryCtaText: z.string().trim().max(80).optional(),
    secondaryCtaUrl: z.string().trim().max(180).optional(),
    mediaItems: bannerMediaArraySchema.optional(),
    isActive: z.boolean()
  })
  .superRefine((value, ctx) => {
    const hasTitle = Boolean(value.title?.trim());
    const hasDescription = Boolean(value.description?.trim());
    const hasMedia = Boolean(value.mediaItems?.length);
    const hasCtaText = Boolean(value.ctaText?.trim());
    const hasCtaUrl = Boolean(value.ctaUrl?.trim());
    const hasSecondaryCtaText = Boolean(value.secondaryCtaText?.trim());
    const hasSecondaryCtaUrl = Boolean(value.secondaryCtaUrl?.trim());

    if ((value.isActive || hasDescription || hasMedia || hasCtaText || hasCtaUrl || hasSecondaryCtaText || hasSecondaryCtaUrl) && !hasTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Active mid-page promos need a title.',
        path: ['title']
      });
    }

    if (hasCtaText !== hasCtaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both primary CTA text and CTA URL, or leave both empty.',
        path: hasCtaText ? ['ctaUrl'] : ['ctaText']
      });
    }

    if (hasSecondaryCtaText !== hasSecondaryCtaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both secondary CTA text and CTA URL, or leave both empty.',
        path: hasSecondaryCtaText ? ['secondaryCtaUrl'] : ['secondaryCtaText']
      });
    }

    if (hasCtaUrl && !value.ctaUrl?.startsWith('/')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primary CTA URL must start with "/".',
        path: ['ctaUrl']
      });
    }

    if (hasSecondaryCtaUrl && !value.secondaryCtaUrl?.startsWith('/')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary CTA URL must start with "/".',
        path: ['secondaryCtaUrl']
      });
    }
  });

export const homeHeroBannerSchema = z.object({
  campaignLabel: z.string().trim().min(2).max(60),
  title: z.string().trim().min(8).max(180),
  subtitle: z.string().trim().min(16).max(500),
  ctaText: z.string().trim().min(2).max(80),
  ctaUrl: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .refine((value) => value.startsWith('/'), 'CTA URL must start with "/"'),
  accentText: z.string().trim().max(180).optional(),
  secondaryCtaText: z.string().trim().min(2).max(80).optional(),
  secondaryCtaUrl: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .refine((value) => value.startsWith('/'), 'Secondary CTA URL must start with "/"')
    .optional(),
  heroCornerImage: z.object({ url: z.string().url(), publicId: z.string().min(1), alt: z.string().optional() }).optional(),
  heroCornerImageEnabled: z.boolean().optional(),
  heroCornerImageSize: z.number().int().min(48).max(180).optional(),
  heroBottomLeftImage: z.object({ url: z.string().url(), publicId: z.string().min(1), alt: z.string().optional() }).optional(),
  heroBottomLeftImageEnabled: z.boolean().optional(),
  heroBottomLeftImageSize: z.number().int().min(48).max(180).optional(),
  heroBottomRightImage: z.object({ url: z.string().url(), publicId: z.string().min(1), alt: z.string().optional() }).optional(),
  heroBottomRightImageEnabled: z.boolean().optional(),
  heroBottomRightImageSize: z.number().int().min(48).max(180).optional(),
  backgroundImage: z.object({ url: z.string().url(), publicId: z.string().min(1), alt: z.string().optional() }).optional(),
  adSlots: z.array(homeAdSlotSchema).length(3),
  featurePromo: homeFeaturePromoSchema.optional(),
  heroSpotlightProductId: z.string().trim().min(1).optional(),
  showcaseProductIds: z.array(z.string().trim().min(1)).max(8).refine((items) => new Set(items).size === items.length, {
    message: 'Showcase products must be unique.'
  }),
  showcaseFeatureGroups: z.array(showcaseFeatureGroupSchema).max(8).optional(),
  isActive: z.boolean()
});

export const externalExpenseSchema = z.object({
  label: z.string().trim().min(2).max(120),
  amount: z.number().min(0),
  incurredOn: z.coerce.date(),
  category: z.string().trim().min(2).max(80).optional(),
  notes: z.string().trim().max(500).optional()
});

export const externalExpenseUpdateSchema = externalExpenseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one expense field must be provided');

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(['customer', 'staff', 'admin', 'workspace']).optional(),
  verification: z.enum(['verified', 'unverified']).optional(),
  includeInactive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))
});
export const auditLogQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  action: z.string().trim().max(120).optional(),
  status: z.enum(['success', 'failure', 'blocked']).optional(),
  actorRole: z.enum(['customer', 'staff', 'admin', 'system']).optional()
});
export const auditLogExportQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  action: z.string().trim().max(120).optional(),
  status: z.enum(['success', 'failure', 'blocked']).optional(),
  actorRole: z.enum(['customer', 'staff', 'admin', 'system']).optional()
});

export const broadcastEmailSchema = z
  .object({
    audience: z.enum(['customers', 'unverifiedCustomers', 'newsletter', 'all', 'specificUsers']),
    recipientUserIds: z.array(objectIdSchema).max(500).optional(),
    subject: z.string().trim().min(3).max(140),
    previewText: z.string().trim().max(180).optional(),
    headline: z.string().trim().min(3).max(140),
    body: z.string().trim().min(12).max(4000),
    ctaLabel: z.string().trim().max(80).optional(),
    ctaUrl: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    const hasCtaLabel = Boolean(value.ctaLabel?.trim());
    const hasCtaUrl = Boolean(value.ctaUrl?.trim());

    if (hasCtaLabel !== hasCtaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both CTA label and CTA URL, or leave both empty.',
        path: hasCtaLabel ? ['ctaUrl'] : ['ctaLabel']
      });
    }

    if (hasCtaUrl && !/^\/|^https?:\/\//i.test(value.ctaUrl ?? '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CTA URL must start with "/" or "http(s)://".',
        path: ['ctaUrl']
      });
    }

    if (value.audience === 'specificUsers' && (!value.recipientUserIds || value.recipientUserIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one user recipient for a specific user segment send.',
        path: ['recipientUserIds']
      });
    }
  });

export const reviewModerationSchema = z.object({
  isApproved: z.boolean()
});

export const reviewReplySchema = z.object({
  adminReply: z.string().trim().min(1).max(1000)
});
