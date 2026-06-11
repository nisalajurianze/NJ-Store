import type {
  BannerDto,
  BannerMutationDto,
  BannerShowcaseFeatureGroupDto,
  BannerShowcaseFeatureIconKey,
  BannerShowcaseFeatureItemDto,
  HomeAdSlotKey,
  ProductSuggestionDto
} from '@njstore/types';
import { z } from 'zod';

export const slotKeys = ['slot-1', 'slot-2', 'slot-3'] as const;
const defaultHeroCornerImageSize = 108;
export const minHeroCornerImageSize = 48;
export const maxHeroCornerImageSize = 180;

export const showcaseFeatureIconOptions: Array<{ value: BannerShowcaseFeatureIconKey; label: string }> = [
  { value: 'camera', label: 'Camera' },
  { value: 'memory', label: 'RAM' },
  { value: 'storage', label: 'Storage' },
  { value: 'battery', label: 'Battery' },
  { value: 'display', label: 'Display' },
  { value: 'chip', label: 'Chip' },
  { value: 'audio', label: 'Audio' },
  { value: 'connectivity', label: 'Connectivity' }
];

const mediaUrlSchema = z.union([z.string().trim().url(), z.literal('')]);
const mediaItemSchema = z
  .object({
    kind: z.enum(['image', 'video']),
    url: mediaUrlSchema,
    publicId: z.string().trim().max(200),
    alt: z.string().trim().max(180).optional()
  })
  .superRefine((value, ctx) => {
    const hasUrl = value.url.length > 0;
    const hasPublicId = value.publicId.length > 0;

    if (hasUrl !== hasPublicId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both media URL and public ID, or leave both empty.',
        path: hasUrl ? ['publicId'] : ['url']
      });
    }
  });

const adSlotSchema = z
  .object({
    slotKey: z.enum(slotKeys),
    eyebrow: z.string().trim().max(60).optional(),
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(220).optional(),
    ctaUrl: z.string().trim().max(180).optional(),
    mediaItems: z.array(mediaItemSchema).max(6),
    isActive: z.boolean()
  })
  .superRefine((value, ctx) => {
    const hasTitle = Boolean(value.title?.trim());
    const hasDescription = Boolean(value.description?.trim());
    const hasMediaItems = value.mediaItems.some((item) => item.url.length > 0 || item.publicId.length > 0 || Boolean(item.alt?.trim()));
    const hasCtaUrl = Boolean(value.ctaUrl?.trim());

    if ((value.isActive || hasDescription || hasMediaItems || hasCtaUrl) && !hasTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Active advertisement slots need a title.',
        path: ['title']
      });
    }

    if (hasCtaUrl && !value.ctaUrl?.startsWith('/')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ad click path must start with "/".',
        path: ['ctaUrl']
      });
    }
  });

const featurePromoSchema = z
  .object({
    eyebrow: z.string().trim().max(60).optional(),
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(320).optional(),
    ctaText: z.string().trim().max(80).optional(),
    ctaUrl: z.string().trim().max(180).optional(),
    secondaryCtaText: z.string().trim().max(80).optional(),
    secondaryCtaUrl: z.string().trim().max(180).optional(),
    mediaItems: z.array(mediaItemSchema).max(6),
    isActive: z.boolean()
  })
  .superRefine((value, ctx) => {
    const hasTitle = Boolean(value.title?.trim());
    const hasDescription = Boolean(value.description?.trim());
    const hasMediaItems = value.mediaItems.some((item) => item.url.length > 0 || item.publicId.length > 0 || Boolean(item.alt?.trim()));
    const hasCtaText = Boolean(value.ctaText?.trim());
    const hasCtaUrl = Boolean(value.ctaUrl?.trim());
    const hasSecondaryCtaText = Boolean(value.secondaryCtaText?.trim());
    const hasSecondaryCtaUrl = Boolean(value.secondaryCtaUrl?.trim());

    if ((value.isActive || hasDescription || hasMediaItems || hasCtaText || hasCtaUrl || hasSecondaryCtaText || hasSecondaryCtaUrl) && !hasTitle) {
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
        message: 'Primary CTA path must start with "/".',
        path: ['ctaUrl']
      });
    }

    if (hasSecondaryCtaUrl && !value.secondaryCtaUrl?.startsWith('/')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary CTA path must start with "/".',
        path: ['secondaryCtaUrl']
      });
    }
  });

export const homeBannerSchema = z
  .object({
    campaignLabel: z.string().trim().min(2).max(60),
    title: z.string().trim().min(8).max(180),
    subtitle: z.string().trim().min(16).max(500),
    ctaText: z.string().trim().min(2).max(80),
    ctaUrl: z.string().trim().min(1).max(160).startsWith('/'),
    accentText: z.string().trim().max(180).optional(),
    heroCornerImageUrl: mediaUrlSchema,
    heroCornerImagePublicId: z.string().trim().max(200),
    heroCornerImageAlt: z.string().trim().max(180).optional(),
    heroCornerImageEnabled: z.boolean(),
    heroCornerImageSize: z.number().int().min(minHeroCornerImageSize).max(maxHeroCornerImageSize),
    heroBottomLeftImageUrl: mediaUrlSchema,
    heroBottomLeftImagePublicId: z.string().trim().max(200),
    heroBottomLeftImageAlt: z.string().trim().max(180).optional(),
    heroBottomLeftImageEnabled: z.boolean(),
    heroBottomLeftImageSize: z.number().int().min(minHeroCornerImageSize).max(maxHeroCornerImageSize),
    heroBottomRightImageUrl: mediaUrlSchema,
    heroBottomRightImagePublicId: z.string().trim().max(200),
    heroBottomRightImageAlt: z.string().trim().max(180).optional(),
    heroBottomRightImageEnabled: z.boolean(),
    heroBottomRightImageSize: z.number().int().min(minHeroCornerImageSize).max(maxHeroCornerImageSize),
    imageUrl: mediaUrlSchema,
    imagePublicId: z.string().trim().max(200),
    imageAlt: z.string().trim().max(180).optional(),
    adSlots: z.array(adSlotSchema).length(3),
    featurePromo: featurePromoSchema,
    isActive: z.boolean()
  })
  .superRefine((value, ctx) => {
    const hasHeroCornerImageUrl = value.heroCornerImageUrl.length > 0;
    const hasHeroCornerImagePublicId = value.heroCornerImagePublicId.length > 0;
    const hasHeroBottomLeftImageUrl = value.heroBottomLeftImageUrl.length > 0;
    const hasHeroBottomLeftImagePublicId = value.heroBottomLeftImagePublicId.length > 0;
    const hasHeroBottomRightImageUrl = value.heroBottomRightImageUrl.length > 0;
    const hasHeroBottomRightImagePublicId = value.heroBottomRightImagePublicId.length > 0;
    const hasImageUrl = value.imageUrl.length > 0;
    const hasPublicId = value.imagePublicId.length > 0;

    if (hasHeroCornerImageUrl !== hasHeroCornerImagePublicId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both a top-right image URL and public ID, or leave both blank.',
        path: hasHeroCornerImageUrl ? ['heroCornerImagePublicId'] : ['heroCornerImageUrl']
      });
    }

    if (hasHeroBottomLeftImageUrl !== hasHeroBottomLeftImagePublicId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both a bottom-left image URL and public ID, or leave both blank.',
        path: hasHeroBottomLeftImageUrl ? ['heroBottomLeftImagePublicId'] : ['heroBottomLeftImageUrl']
      });
    }

    if (hasHeroBottomRightImageUrl !== hasHeroBottomRightImagePublicId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both a bottom-right image URL and public ID, or leave both blank.',
        path: hasHeroBottomRightImageUrl ? ['heroBottomRightImagePublicId'] : ['heroBottomRightImageUrl']
      });
    }

    if (hasImageUrl !== hasPublicId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both a background image URL and public ID, or leave both blank.',
        path: hasImageUrl ? ['imagePublicId'] : ['imageUrl']
      });
    }
  });

export type HomeBannerFormValues = z.infer<typeof homeBannerSchema>;
export type EditorSectionKey = 'hero' | 'hero-spotlight' | 'feature-promo' | HomeAdSlotKey | 'showcase';
export type HomeBannerMediaItemFormValues = HomeBannerFormValues['adSlots'][number]['mediaItems'][number];
export type HomeBannerFeaturePromoFormValues = HomeBannerFormValues['featurePromo'];

export const heroFieldNames = ['campaignLabel', 'title', 'subtitle', 'ctaText', 'ctaUrl', 'accentText', 'imageUrl', 'imagePublicId', 'imageAlt', 'isActive'] as const;
export const heroSpotlightFieldNames = [
  'heroCornerImageUrl',
  'heroCornerImagePublicId',
  'heroCornerImageAlt',
  'heroCornerImageEnabled',
  'heroCornerImageSize',
  'heroBottomLeftImageUrl',
  'heroBottomLeftImagePublicId',
  'heroBottomLeftImageAlt',
  'heroBottomLeftImageEnabled',
  'heroBottomLeftImageSize',
  'heroBottomRightImageUrl',
  'heroBottomRightImagePublicId',
  'heroBottomRightImageAlt',
  'heroBottomRightImageEnabled',
  'heroBottomRightImageSize'
] as const;
export const featurePromoFieldNames = [
  'featurePromo.eyebrow',
  'featurePromo.title',
  'featurePromo.description',
  'featurePromo.ctaText',
  'featurePromo.ctaUrl',
  'featurePromo.secondaryCtaText',
  'featurePromo.secondaryCtaUrl',
  'featurePromo.mediaItems',
  'featurePromo.isActive'
] as const;

export const adSlotFieldNames = (index: number) =>
  [
    `adSlots.${index}.eyebrow`,
    `adSlots.${index}.title`,
    `adSlots.${index}.description`,
    `adSlots.${index}.ctaUrl`,
    `adSlots.${index}.mediaItems`,
    `adSlots.${index}.isActive`
  ] as const;

export const hasMediaItemContent = (item: HomeBannerMediaItemFormValues): boolean =>
  Boolean(item.url.trim() || item.publicId.trim() || item.alt?.trim());

export const createEmptyMediaItem = (kind: HomeBannerMediaItemFormValues['kind'] = 'image'): HomeBannerMediaItemFormValues => ({
  kind,
  url: '',
  publicId: '',
  alt: ''
});

const buildMediaItemDefaults = (
  entry?:
    | {
        mediaItems?: Array<{ kind: HomeBannerMediaItemFormValues['kind']; url: string; publicId: string; alt?: string }>;
      }
    | null
) =>
  entry?.mediaItems?.length
    ? entry.mediaItems.map((media) => ({
        kind: media.kind,
        url: media.url,
        publicId: media.publicId,
        alt: media.alt ?? ''
      }))
    : [];

const buildOptionalImageAsset = (url: string, publicId: string, alt?: string) =>
  url && publicId
    ? {
        url,
        publicId,
        alt: alt?.trim() || undefined
      }
    : undefined;

export const normalizeHeroCornerImageSize = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : defaultHeroCornerImageSize;

const resolveHeroCornerImageEnabled = (value: boolean | undefined): boolean => (typeof value === 'boolean' ? value : true);

const hasSlotEditorContent = (slot: HomeBannerFormValues['adSlots'][number]): boolean =>
  Boolean(
    slot.eyebrow?.trim() ||
      slot.title?.trim() ||
      slot.description?.trim() ||
      slot.ctaUrl?.trim() ||
      slot.mediaItems.some((item) => hasMediaItemContent(item))
  );

const normalizeDormantAdSlots = (
  slots: HomeBannerFormValues['adSlots']
): HomeBannerFormValues['adSlots'] =>
  slots.map((slot) => (hasSlotEditorContent(slot) ? slot : { ...slot, isActive: false }));

const hasFeaturePromoEditorContent = (featurePromo: HomeBannerFeaturePromoFormValues): boolean =>
  Boolean(
    featurePromo.eyebrow?.trim() ||
      featurePromo.title?.trim() ||
      featurePromo.description?.trim() ||
      featurePromo.ctaText?.trim() ||
      featurePromo.ctaUrl?.trim() ||
      featurePromo.secondaryCtaText?.trim() ||
      featurePromo.secondaryCtaUrl?.trim() ||
      featurePromo.mediaItems.some((item) => hasMediaItemContent(item))
  );

const normalizeDormantFeaturePromo = (
  featurePromo: HomeBannerFeaturePromoFormValues
): HomeBannerFeaturePromoFormValues => (hasFeaturePromoEditorContent(featurePromo) ? featurePromo : { ...featurePromo, isActive: false });

const buildSlotDefaults = (
  slotKey: HomeAdSlotKey,
  slot?: BannerDto['adSlots'][number]
): HomeBannerFormValues['adSlots'][number] => ({
  slotKey,
  eyebrow: slot?.eyebrow ?? '',
  title: slot?.title ?? '',
  description: slot?.description ?? '',
  ctaUrl: slot?.ctaUrl ?? '',
  mediaItems: buildMediaItemDefaults(slot),
  isActive: slot?.isActive ?? false
});

const buildFeaturePromoDefaults = (featurePromo?: BannerDto['featurePromo']): HomeBannerFeaturePromoFormValues => ({
  eyebrow: featurePromo?.eyebrow ?? '',
  title: featurePromo?.title ?? '',
  description: featurePromo?.description ?? '',
  ctaText: featurePromo?.ctaText ?? '',
  ctaUrl: featurePromo?.ctaUrl ?? '',
  secondaryCtaText: featurePromo?.secondaryCtaText ?? '',
  secondaryCtaUrl: featurePromo?.secondaryCtaUrl ?? '',
  mediaItems: buildMediaItemDefaults(featurePromo),
  isActive: featurePromo?.isActive ?? false
});

export const buildDefaults = (banner?: BannerDto): HomeBannerFormValues => ({
  campaignLabel: banner?.campaignLabel ?? 'NJ Store',
  title: banner?.title ?? '',
  subtitle: banner?.subtitle ?? '',
  ctaText: banner?.ctaText ?? 'Shop Collection',
  ctaUrl: banner?.ctaUrl ?? '/shop',
  accentText: banner?.accentText ?? '',
  heroCornerImageUrl: banner?.heroCornerImage?.url ?? '',
  heroCornerImagePublicId: banner?.heroCornerImage?.publicId ?? '',
  heroCornerImageAlt: banner?.heroCornerImage?.alt ?? '',
  heroCornerImageEnabled: resolveHeroCornerImageEnabled(banner?.heroCornerImageEnabled),
  heroCornerImageSize: banner?.heroCornerImageSize ?? defaultHeroCornerImageSize,
  heroBottomLeftImageUrl: banner?.heroBottomLeftImage?.url ?? '',
  heroBottomLeftImagePublicId: banner?.heroBottomLeftImage?.publicId ?? '',
  heroBottomLeftImageAlt: banner?.heroBottomLeftImage?.alt ?? '',
  heroBottomLeftImageEnabled: resolveHeroCornerImageEnabled(banner?.heroBottomLeftImageEnabled),
  heroBottomLeftImageSize: banner?.heroBottomLeftImageSize ?? defaultHeroCornerImageSize,
  heroBottomRightImageUrl: banner?.heroBottomRightImage?.url ?? '',
  heroBottomRightImagePublicId: banner?.heroBottomRightImage?.publicId ?? '',
  heroBottomRightImageAlt: banner?.heroBottomRightImage?.alt ?? '',
  heroBottomRightImageEnabled: resolveHeroCornerImageEnabled(banner?.heroBottomRightImageEnabled),
  heroBottomRightImageSize: banner?.heroBottomRightImageSize ?? defaultHeroCornerImageSize,
  imageUrl: banner?.backgroundImage?.url ?? '',
  imagePublicId: banner?.backgroundImage?.publicId ?? '',
  imageAlt: banner?.backgroundImage?.alt ?? '',
  adSlots: slotKeys.map((slotKey) => buildSlotDefaults(slotKey, banner?.adSlots.find((slot) => slot.slotKey === slotKey))),
  featurePromo: buildFeaturePromoDefaults(banner?.featurePromo),
  isActive: banner?.isActive ?? false
});

export const buildSectionBaseValues = (banner?: BannerDto | null): HomeBannerFormValues => {
  const defaults = buildDefaults(banner ?? undefined);
  return {
    ...defaults,
    adSlots: normalizeDormantAdSlots(defaults.adSlots),
    featurePromo: normalizeDormantFeaturePromo(defaults.featurePromo)
  };
};

export const mapProductSelection = (product?: BannerDto['heroSpotlightProduct'] | BannerDto['showcaseProducts'][number]): ProductSuggestionDto | null =>
  product
    ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        thumbnail: product.thumbnail
      }
    : null;

export const mapShowcaseProducts = (banner?: BannerDto): ProductSuggestionDto[] =>
  (banner?.showcaseProducts ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    thumbnail: product.thumbnail
  }));

export const mapShowcaseFeatureGroups = (banner?: BannerDto): Record<string, BannerShowcaseFeatureItemDto[]> =>
  Object.fromEntries((banner?.showcaseFeatureGroups ?? []).map((group) => [group.productId, group.items]));

const buildShowcaseFeatureGroupsPayload = (
  showcaseProducts: ProductSuggestionDto[],
  featureGroups: Record<string, BannerShowcaseFeatureItemDto[]>
): BannerShowcaseFeatureGroupDto[] =>
  showcaseProducts.flatMap((product) => {
    const items = (featureGroups[product.id] ?? [])
      .map((item) => ({
        icon: item.icon,
        label: item.label.trim(),
        value: item.value.trim()
      }))
      .filter((item) => item.label.length > 0 && item.value.length > 0)
      .slice(0, 4);

    return items.length ? [{ productId: product.id, items }] : [];
  });

export const buildMutationPayload = (
  values: HomeBannerFormValues,
  heroSpotlightProduct: ProductSuggestionDto | null,
  showcaseProducts: ProductSuggestionDto[],
  showcaseFeatureGroups: Record<string, BannerShowcaseFeatureItemDto[]>
): BannerMutationDto => ({
  campaignLabel: values.campaignLabel,
  title: values.title,
  subtitle: values.subtitle,
  ctaText: values.ctaText,
  ctaUrl: values.ctaUrl,
  accentText: values.accentText?.trim() || undefined,
  heroCornerImage: buildOptionalImageAsset(values.heroCornerImageUrl, values.heroCornerImagePublicId, values.heroCornerImageAlt),
  heroCornerImageEnabled: values.heroCornerImageEnabled,
  heroCornerImageSize: values.heroCornerImageSize,
  heroBottomLeftImage: buildOptionalImageAsset(
    values.heroBottomLeftImageUrl,
    values.heroBottomLeftImagePublicId,
    values.heroBottomLeftImageAlt
  ),
  heroBottomLeftImageEnabled: values.heroBottomLeftImageEnabled,
  heroBottomLeftImageSize: values.heroBottomLeftImageSize,
  heroBottomRightImage: buildOptionalImageAsset(
    values.heroBottomRightImageUrl,
    values.heroBottomRightImagePublicId,
    values.heroBottomRightImageAlt
  ),
  heroBottomRightImageEnabled: values.heroBottomRightImageEnabled,
  heroBottomRightImageSize: values.heroBottomRightImageSize,
  backgroundImage:
    values.imageUrl && values.imagePublicId
      ? {
          url: values.imageUrl,
          publicId: values.imagePublicId,
          alt: values.imageAlt?.trim() || undefined
        }
      : undefined,
  adSlots: values.adSlots.map((slot) => ({
    slotKey: slot.slotKey,
    eyebrow: slot.eyebrow?.trim() || undefined,
    title: slot.title?.trim() || undefined,
    description: slot.description?.trim() || undefined,
    ctaUrl: slot.ctaUrl?.trim() || undefined,
    mediaItems: slot.mediaItems
      .filter((media) => media.url && media.publicId)
      .map((media) => ({
        kind: media.kind,
        url: media.url,
        publicId: media.publicId,
        alt: media.alt?.trim() || undefined
      })),
    isActive: slot.isActive
  })),
  featurePromo: {
    eyebrow: values.featurePromo.eyebrow?.trim() || undefined,
    title: values.featurePromo.title?.trim() || undefined,
    description: values.featurePromo.description?.trim() || undefined,
    ctaText: values.featurePromo.ctaText?.trim() || undefined,
    ctaUrl: values.featurePromo.ctaUrl?.trim() || undefined,
    secondaryCtaText: values.featurePromo.secondaryCtaText?.trim() || undefined,
    secondaryCtaUrl: values.featurePromo.secondaryCtaUrl?.trim() || undefined,
    mediaItems: values.featurePromo.mediaItems
      .filter((media) => media.url && media.publicId)
      .map((media) => ({
        kind: media.kind,
        url: media.url,
        publicId: media.publicId,
        alt: media.alt?.trim() || undefined
      })),
    isActive: values.featurePromo.isActive
  },
  heroSpotlightProductId: heroSpotlightProduct?.id,
  showcaseProductIds: showcaseProducts.map((product) => product.id),
  showcaseFeatureGroups: buildShowcaseFeatureGroupsPayload(showcaseProducts, showcaseFeatureGroups),
  isActive: values.isActive
});
