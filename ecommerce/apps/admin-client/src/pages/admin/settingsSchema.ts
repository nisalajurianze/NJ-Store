/**
 * Settings page — Zod schemas, defaults, and payload builders.
 *
 * Extracted from Settings.tsx to isolate validation logic from the React component.
 */
import { z } from 'zod';
import type { ImageAsset } from '@njstore/types';

// ─── URL / coordinate primitives ────────────────────────────────────
export const optionalUrlField = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().url('Enter a valid URL').or(z.literal(''))
);

const isGoogleMapsEmbedUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    const isGoogleMapsUrl = url.protocol === 'https:' && ['www.google.com', 'maps.google.com'].includes(url.hostname) && url.pathname.startsWith('/maps');
    const isEmbedMode = url.pathname.startsWith('/maps/embed') || url.searchParams.get('output') === 'embed';

    return isGoogleMapsUrl && isEmbedMode;
  } catch {
    return false;
  }
};

const optionalMapEmbedUrlField = optionalUrlField.refine((value) => value === '' || isGoogleMapsEmbedUrl(value), {
  message: 'Use a Google Maps embed URL that includes /maps/embed or output=embed.'
});

export const optionalCoordinateField = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(min).max(max).optional()
  );

// ─── Defaults ────────────────────────────────────────────────────────
export const defaultMaintenanceMessage = "We're making a few improvements right now. Please check back shortly.";
export const defaultTaxLabel = 'VAT';
export const defaultSupportedCurrencies = [{ code: 'LKR', symbol: 'LKR', rate: 1, isDefault: true }];

export const defaultFooterQuickLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Return Policy', href: '/returns' },
  { label: 'FAQ', href: '/faq' }
];

export const defaultFooterSectionTitles = {
  about: 'About',
  quickLinks: 'Quick Links',
  contact: 'Contact Info',
  social: 'Social & Updates'
};

export const defaultFooterDescription = 'Premium electronics, responsive service, and transparent custom quotations.';
export const defaultFooterEmail = 'support@njstore.com';
export const defaultFooterAddress = '120 Galle Road, Colombo 03, Sri Lanka';
export const defaultFooterMapEmbedUrl = 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed';
export const defaultFooterCopyright = '© NJ Store. All rights reserved.';

export const defaultNotificationSettings = {
  quotationReady: { emailEnabled: true, smsEnabled: false },
  orderConfirmed: { emailEnabled: true, smsEnabled: false },
  orderShipped: { emailEnabled: true, smsEnabled: false },
  receiptRejected: { emailEnabled: true, smsEnabled: false },
  lowStockAlert: { emailEnabled: true, smsEnabled: false }
};

// ─── Notification rule metadata ──────────────────────────────────────
export const notificationRuleDefinitions = [
  {
    key: 'quotationReady',
    label: 'Quotation ready',
    description: 'Sent when the quotation PDF is created and the customer can review it.'
  },
  {
    key: 'orderConfirmed',
    label: 'Order confirmed',
    description: 'Sent after the customer confirms the quotation into a live order.'
  },
  {
    key: 'orderShipped',
    label: 'Order shipped',
    description: 'Used by the admin shipping action once a delivery order is marked shipped.'
  },
  {
    key: 'receiptRejected',
    label: 'Receipt rejected',
    description: 'Alerts the customer when a payment receipt needs to be uploaded again.'
  },
  {
    key: 'lowStockAlert',
    label: 'Low stock alert',
    description: 'Warns the store when variant inventory drops below the configured threshold.'
  }
] as const;

// ─── Sub-schemas ─────────────────────────────────────────────────────
const notificationChannelSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean()
});

const supportedCurrenciesSchema = z
  .array(
    z.object({
      code: z.string().trim().toUpperCase().length(3),
      symbol: z.string().trim().min(1).max(8),
      rate: z.coerce.number().min(0.0001),
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
        message: 'Choose exactly one default currency.'
      });
    }

    if (!currencies.some((currency) => currency.code === 'LKR')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'LKR must remain available as the base store currency.'
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

const addImageAssetPairIssue = (
  ctx: z.RefinementCtx,
  url: string | undefined,
  publicId: string | undefined,
  urlPath: string,
  publicIdPath: string
): void => {
  const hasUrl = Boolean(url?.trim());
  const hasPublicId = Boolean(publicId?.trim());

  if (hasUrl !== hasPublicId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: hasUrl ? 'Asset public ID is required when a logo URL is set.' : 'Logo URL is required when an asset public ID is set.',
      path: [hasUrl ? publicIdPath : urlPath]
    });
  }
};

// ─── Main form schema ────────────────────────────────────────────────
const settingsBaseSchema = z.object({
    storeName: z.string().trim().min(2),
    storeLogoUrl: optionalUrlField,
    storeLogoPublicId: z.string().trim().optional(),
    storeLogoAlt: z.string().trim().max(120).optional(),
    storeLogoDarkUrl: optionalUrlField,
    storeLogoDarkPublicId: z.string().trim().optional(),
    storeLogoDarkAlt: z.string().trim().max(120).optional(),
    storeLogoLightUrl: optionalUrlField,
    storeLogoLightPublicId: z.string().trim().optional(),
    storeLogoLightAlt: z.string().trim().max(120).optional(),
    footerLogoUrl: optionalUrlField,
    footerLogoPublicId: z.string().trim().optional(),
    footerLogoAlt: z.string().trim().max(120).optional(),
    footerCompanyName: z.string().trim().min(2).max(120),
    footerDescription: z.string().trim().min(8).max(280),
    footerEmail: z.string().trim().email(),
    footerPhone: z
      .string()
      .trim()
      .min(7)
      .max(25)
      .regex(/^\+?[0-9()\-\s]+$/, 'Enter a valid footer phone number'),
    footerWhatsappNumber: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .regex(/^\+?[0-9()\-\s]+$/, 'Enter a valid WhatsApp number'),
    footerPhysicalAddress: z.string().trim().min(8).max(220),
    footerMapEmbedUrl: optionalMapEmbedUrlField,
    footerLatitude: optionalCoordinateField(-90, 90),
    footerLongitude: optionalCoordinateField(-180, 180),
    footerOpeningHours: z.string().trim().max(120).optional(),
    footerCopyrightText: z.string().trim().min(4).max(160),
    footerFacebookUrl: optionalUrlField,
    footerInstagramUrl: optionalUrlField,
    footerTikTokUrl: optionalUrlField,
    footerYouTubeUrl: optionalUrlField,
    footerXUrl: optionalUrlField,
    footerSectionAboutTitle: z.string().trim().min(2).max(40),
    footerSectionQuickLinksTitle: z.string().trim().min(2).max(40),
    footerSectionContactTitle: z.string().trim().min(2).max(40),
    footerSectionSocialTitle: z.string().trim().min(2).max(40),
    footerQuickLinks: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(40),
          href: z.string().trim().min(1).max(180)
        })
      )
      .min(1)
      .max(8),
    supportedCurrencies: supportedCurrenciesSchema,
    freeShippingThreshold: z.coerce.number().min(0),
    lowStockThreshold: z.coerce.number().min(0),
    loyaltyPointsRate: z.coerce.number().min(1),
    cancellationWindowHours: z.coerce.number().min(0),
    quotationExpiryDays: z.coerce.number().min(1),
    taxEnabled: z.boolean(),
    taxLabel: z.string().trim().min(2).max(32),
    taxRate: z.coerce.number().min(0).max(100),
    cashOnDeliveryEnabled: z.boolean(),
    maintenanceEnabled: z.boolean(),
    maintenanceMessage: z.string().trim().min(8).max(240),
    notificationSettings: z.object({
      quotationReady: notificationChannelSchema,
      orderConfirmed: notificationChannelSchema,
      orderShipped: notificationChannelSchema,
      receiptRejected: notificationChannelSchema,
      lowStockAlert: notificationChannelSchema
    }),
    accountName: z.string().trim().min(2),
    bankName: z.string().trim().min(2),
    branch: z.string().trim().min(2),
    accountNumber: z.string().trim().min(4),
    shippingRates: z.array(
      z.object({
        city: z.string().trim().min(2),
        fee: z.coerce.number().min(0),
        days: z.string().trim().min(1)
      })
    ),
    emailTemplates: z.array(
      z.object({
        type: z.string().trim().min(2),
        subject: z.string().trim().min(2),
        bodyHtml: z.string().trim().min(2)
      })
    )
});

export const settingsSchema = settingsBaseSchema.superRefine((values, ctx) => {
    const hasLatitude = typeof values.footerLatitude === 'number';
    const hasLongitude = typeof values.footerLongitude === 'number';

    addImageAssetPairIssue(ctx, values.storeLogoUrl, values.storeLogoPublicId, 'storeLogoUrl', 'storeLogoPublicId');
    addImageAssetPairIssue(ctx, values.storeLogoDarkUrl, values.storeLogoDarkPublicId, 'storeLogoDarkUrl', 'storeLogoDarkPublicId');
    addImageAssetPairIssue(ctx, values.storeLogoLightUrl, values.storeLogoLightPublicId, 'storeLogoLightUrl', 'storeLogoLightPublicId');
    addImageAssetPairIssue(ctx, values.footerLogoUrl, values.footerLogoPublicId, 'footerLogoUrl', 'footerLogoPublicId');

    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both latitude and longitude or leave both blank.',
        path: [hasLatitude ? 'footerLongitude' : 'footerLatitude']
      });
    }
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const settingsSectionSchemas = {
  operations: z
    .object({
      storeName: settingsBaseSchema.shape.storeName,
      storeLogoUrl: settingsBaseSchema.shape.storeLogoUrl,
      storeLogoPublicId: settingsBaseSchema.shape.storeLogoPublicId,
      storeLogoAlt: settingsBaseSchema.shape.storeLogoAlt,
      storeLogoDarkUrl: settingsBaseSchema.shape.storeLogoDarkUrl,
      storeLogoDarkPublicId: settingsBaseSchema.shape.storeLogoDarkPublicId,
      storeLogoDarkAlt: settingsBaseSchema.shape.storeLogoDarkAlt,
      storeLogoLightUrl: settingsBaseSchema.shape.storeLogoLightUrl,
      storeLogoLightPublicId: settingsBaseSchema.shape.storeLogoLightPublicId,
      storeLogoLightAlt: settingsBaseSchema.shape.storeLogoLightAlt,
      supportedCurrencies: settingsBaseSchema.shape.supportedCurrencies,
      freeShippingThreshold: settingsBaseSchema.shape.freeShippingThreshold,
      lowStockThreshold: settingsBaseSchema.shape.lowStockThreshold,
      loyaltyPointsRate: settingsBaseSchema.shape.loyaltyPointsRate,
      cancellationWindowHours: settingsBaseSchema.shape.cancellationWindowHours,
      quotationExpiryDays: settingsBaseSchema.shape.quotationExpiryDays,
      taxEnabled: settingsBaseSchema.shape.taxEnabled,
      taxLabel: settingsBaseSchema.shape.taxLabel,
      taxRate: settingsBaseSchema.shape.taxRate
    })
    .superRefine((values, ctx) => {
      addImageAssetPairIssue(ctx, values.storeLogoUrl, values.storeLogoPublicId, 'storeLogoUrl', 'storeLogoPublicId');
      addImageAssetPairIssue(ctx, values.storeLogoDarkUrl, values.storeLogoDarkPublicId, 'storeLogoDarkUrl', 'storeLogoDarkPublicId');
      addImageAssetPairIssue(ctx, values.storeLogoLightUrl, values.storeLogoLightPublicId, 'storeLogoLightUrl', 'storeLogoLightPublicId');
    }),
  presence: z
    .object({
      footerLogoUrl: settingsBaseSchema.shape.footerLogoUrl,
      footerLogoPublicId: settingsBaseSchema.shape.footerLogoPublicId,
      footerLogoAlt: settingsBaseSchema.shape.footerLogoAlt,
      footerCompanyName: settingsBaseSchema.shape.footerCompanyName,
      footerDescription: settingsBaseSchema.shape.footerDescription,
      footerEmail: settingsBaseSchema.shape.footerEmail,
      footerPhone: settingsBaseSchema.shape.footerPhone,
      footerWhatsappNumber: settingsBaseSchema.shape.footerWhatsappNumber,
      footerPhysicalAddress: settingsBaseSchema.shape.footerPhysicalAddress,
      footerMapEmbedUrl: settingsBaseSchema.shape.footerMapEmbedUrl,
      footerLatitude: settingsBaseSchema.shape.footerLatitude,
      footerLongitude: settingsBaseSchema.shape.footerLongitude,
      footerOpeningHours: settingsBaseSchema.shape.footerOpeningHours,
      footerCopyrightText: settingsBaseSchema.shape.footerCopyrightText,
      footerFacebookUrl: settingsBaseSchema.shape.footerFacebookUrl,
      footerInstagramUrl: settingsBaseSchema.shape.footerInstagramUrl,
      footerTikTokUrl: settingsBaseSchema.shape.footerTikTokUrl,
      footerYouTubeUrl: settingsBaseSchema.shape.footerYouTubeUrl,
      footerXUrl: settingsBaseSchema.shape.footerXUrl,
      footerSectionAboutTitle: settingsBaseSchema.shape.footerSectionAboutTitle,
      footerSectionQuickLinksTitle: settingsBaseSchema.shape.footerSectionQuickLinksTitle,
      footerSectionContactTitle: settingsBaseSchema.shape.footerSectionContactTitle,
      footerSectionSocialTitle: settingsBaseSchema.shape.footerSectionSocialTitle,
      footerQuickLinks: settingsBaseSchema.shape.footerQuickLinks,
      maintenanceEnabled: settingsBaseSchema.shape.maintenanceEnabled,
      maintenanceMessage: settingsBaseSchema.shape.maintenanceMessage
    })
    .superRefine((values, ctx) => {
      const hasLatitude = typeof values.footerLatitude === 'number';
      const hasLongitude = typeof values.footerLongitude === 'number';

      addImageAssetPairIssue(ctx, values.footerLogoUrl, values.footerLogoPublicId, 'footerLogoUrl', 'footerLogoPublicId');

      if (hasLatitude !== hasLongitude) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide both latitude and longitude or leave both blank.',
          path: [hasLatitude ? 'footerLongitude' : 'footerLatitude']
        });
      }
    }),
  payments: z.object({
    accountName: settingsBaseSchema.shape.accountName,
    bankName: settingsBaseSchema.shape.bankName,
    branch: settingsBaseSchema.shape.branch,
    accountNumber: settingsBaseSchema.shape.accountNumber,
    cashOnDeliveryEnabled: settingsBaseSchema.shape.cashOnDeliveryEnabled
  }),
  shipping: z.object({
    shippingRates: settingsBaseSchema.shape.shippingRates
  }),
  communications: z.object({
    notificationSettings: settingsBaseSchema.shape.notificationSettings,
    emailTemplates: settingsBaseSchema.shape.emailTemplates
  })
} as const;

// ─── Payload builders ────────────────────────────────────────────────
export const buildStoreLogoPayload = (values: SettingsFormValues): ImageAsset | null => {
  const url = values.storeLogoUrl?.trim();
  const publicId = values.storeLogoPublicId?.trim();

  if (!url || !publicId) {
    return null;
  }

  return {
    url,
    publicId,
    alt: values.storeLogoAlt?.trim() || undefined
  };
};

export const buildStoreLogoDarkPayload = (values: SettingsFormValues): ImageAsset | null => {
  const url = values.storeLogoDarkUrl?.trim();
  const publicId = values.storeLogoDarkPublicId?.trim();

  if (!url || !publicId) {
    return null;
  }

  return {
    url,
    publicId,
    alt: values.storeLogoDarkAlt?.trim() || undefined
  };
};

export const buildStoreLogoLightPayload = (values: SettingsFormValues): ImageAsset | null => {
  const url = values.storeLogoLightUrl?.trim();
  const publicId = values.storeLogoLightPublicId?.trim();

  if (!url || !publicId) {
    return null;
  }

  return {
    url,
    publicId,
    alt: values.storeLogoLightAlt?.trim() || undefined
  };
};

export const buildFooterLogoPayload = (values: SettingsFormValues): ImageAsset | null => {
  const url = values.footerLogoUrl?.trim();
  const publicId = values.footerLogoPublicId?.trim();

  if (!url || !publicId) {
    return null;
  }

  return {
    url,
    publicId,
    alt: values.footerLogoAlt?.trim() || undefined
  };
};

export const buildFooterPayload = (values: SettingsFormValues) => ({
  companyName: values.footerCompanyName.trim(),
  logo: buildFooterLogoPayload(values),
  description: values.footerDescription.trim(),
  email: values.footerEmail.trim(),
  phone: values.footerPhone.trim(),
  whatsappNumber: values.footerWhatsappNumber.trim(),
  physicalAddress: values.footerPhysicalAddress.trim(),
  mapEmbedUrl: values.footerMapEmbedUrl.trim(),
  latitude: typeof values.footerLatitude === 'number' ? values.footerLatitude : undefined,
  longitude: typeof values.footerLongitude === 'number' ? values.footerLongitude : undefined,
  openingHours: values.footerOpeningHours?.trim() || undefined,
  copyrightText: values.footerCopyrightText.trim(),
  socialLinks: {
    facebook: values.footerFacebookUrl.trim(),
    instagram: values.footerInstagramUrl.trim(),
    tiktok: values.footerTikTokUrl.trim(),
    youtube: values.footerYouTubeUrl.trim(),
    x: values.footerXUrl.trim()
  },
  sectionTitles: {
    about: values.footerSectionAboutTitle.trim(),
    quickLinks: values.footerSectionQuickLinksTitle.trim(),
    contact: values.footerSectionContactTitle.trim(),
    social: values.footerSectionSocialTitle.trim()
  },
  quickLinks: values.footerQuickLinks.map((link) => ({
    label: link.label.trim(),
    href: link.href.trim()
  }))
});
