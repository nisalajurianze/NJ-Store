import type { BannerDto, BannerMutationDto } from '@njstore/types';
import { Types } from 'mongoose';
import { Banner } from '../models/Banner.js';
import { Product } from '../models/Product.js';
import { cacheNamespaces, cacheService } from './cacheService.js';
import { serializeBanner } from '../utils/serializers.js';
import { AppError } from '../utils/AppError.js';

const HOME_HERO_KEY = 'home-hero' as const;
const BANNER_CACHE_TTL_SECONDS = 10 * 60;
const BANNER_QUERY_TIMEOUT_MS = 5_000;
const HOME_AD_SLOT_KEYS = ['slot-1', 'slot-2', 'slot-3'] as const;
const BANNER_SELECT = [
  'key',
  'campaignLabel',
  'title',
  'subtitle',
  'ctaText',
  'ctaUrl',
  'accentText',
  'heroCornerImage',
  'heroCornerImageEnabled',
  'heroCornerImageSize',
  'heroBottomLeftImage',
  'heroBottomLeftImageEnabled',
  'heroBottomLeftImageSize',
  'heroBottomRightImage',
  'heroBottomRightImageEnabled',
  'heroBottomRightImageSize',
  'backgroundImage',
  'adSlots',
  'featurePromo',
  'heroSpotlightProduct',
  'showcaseProducts',
  'showcaseFeatureGroups',
  'isActive',
  'updatedAt'
].join(' ');
const BANNER_PRODUCT_SELECT = [
  '_id',
  'name',
  'slug',
  'shortDescription',
  'price',
  'comparePrice',
  'images',
  'category',
  'brand',
  'brandName',
  'condition',
  'ratings',
  'isBestSeller',
  'isFeatured',
  'isFlashDeal',
  'flashDealEndsAt',
  'isActive',
  'publishAt',
  'bundleStock',
  'variants.color',
  'variants.colorCode',
  'variants.stock',
  'productType'
].join(' ');
const BANNER_CATEGORY_SELECT = '_id name slug image';
const BANNER_BRAND_SELECT = '_id name slug logo isActive sortOrder';

type LegacyBannerRecord = Record<string, unknown> & { _id: Types.ObjectId };
type LegacyMediaContainer = Record<string, unknown> & {
  media?: unknown;
  mediaItems?: unknown;
};

const hasLegacyMedia = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && 'url' in value && 'publicId' in value);

const migrateLegacyMediaItems = (entry: LegacyMediaContainer): Record<string, unknown> => {
  const mediaItems = Array.isArray(entry.mediaItems) && entry.mediaItems.length > 0 ? entry.mediaItems : hasLegacyMedia(entry.media) ? [entry.media] : [];
  const nextEntry = { ...entry, mediaItems };
  delete nextEntry.media;
  return nextEntry;
};

const migrateLegacyHomeHeroBannerFields = async (): Promise<void> => {
  const legacyBanners = (await Banner.collection
    .find({
      key: HOME_HERO_KEY,
      $or: [
        { heroHighlights: { $exists: true } },
        { heroSignalCards: { $exists: true } },
        { heroSupportCards: { $exists: true } },
        { 'adSlots.media': { $exists: true } },
        { 'featurePromo.media': { $exists: true } }
      ]
    })
    .toArray()) as LegacyBannerRecord[];

  for (const legacyBanner of legacyBanners) {
    const set: Record<string, unknown> = {};

    if (Array.isArray(legacyBanner.adSlots)) {
      set.adSlots = legacyBanner.adSlots.map((slot) =>
        slot && typeof slot === 'object' ? migrateLegacyMediaItems(slot as LegacyMediaContainer) : slot
      );
    }

    if (legacyBanner.featurePromo && typeof legacyBanner.featurePromo === 'object') {
      set.featurePromo = migrateLegacyMediaItems(legacyBanner.featurePromo as LegacyMediaContainer);
    }

    await Banner.collection.updateOne(
      { _id: legacyBanner._id },
      {
        ...(Object.keys(set).length > 0 ? { $set: set } : {}),
        $unset: {
          heroHighlights: '',
          heroSignalCards: '',
          heroSupportCards: ''
        }
      }
    );
  }
};

let legacyHomeHeroBannerMigrationPromise: Promise<void> | null = null;

const ensureLegacyHomeHeroBannerMigration = (): Promise<void> => {
  legacyHomeHeroBannerMigrationPromise ??= migrateLegacyHomeHeroBannerFields().catch((error) => {
    legacyHomeHeroBannerMigrationPromise = null;
    throw error;
  });

  return legacyHomeHeroBannerMigrationPromise;
};

const homeHeroProductPopulate = {
  path: 'heroSpotlightProduct',
  match: { isActive: true },
  select: BANNER_PRODUCT_SELECT,
  populate: [
    { path: 'category', select: BANNER_CATEGORY_SELECT },
    { path: 'brand', select: BANNER_BRAND_SELECT }
  ]
};

const showcaseProductsPopulate = {
  path: 'showcaseProducts',
  match: { isActive: true },
  select: BANNER_PRODUCT_SELECT,
  populate: [
    { path: 'category', select: BANNER_CATEGORY_SELECT },
    { path: 'brand', select: BANNER_BRAND_SELECT }
  ]
};

const defaultAdSlots = () => [
  {
    slotKey: 'slot-1' as const,
    eyebrow: 'Spotlight',
    title: 'Official stock arrivals',
    description: 'Feature a fresh promo card here with image, video, or text-only copy.',
    ctaUrl: '/shop',
    isActive: true
  },
  {
    slotKey: 'slot-2' as const,
    eyebrow: 'Campaign',
    title: 'Admin-managed story block',
    description: 'Each advertisement place can carry its own media, click path, and campaign message.',
    ctaUrl: '/shop?featured=true',
    isActive: true
  },
  {
    slotKey: 'slot-3' as const,
    eyebrow: 'Video or image',
    title: 'Swap this card independently',
    description: 'Update this slot without changing the main hero or the curated product showcase.',
    ctaUrl: '/shop?flashDeal=true',
    isActive: true
  }
];

const defaultFeaturePromo = () => ({
  eyebrow: 'Feature promo',
  title: 'Showcase a wide campaign block',
  description: 'Add a full-width promotion between New Arrivals and Brands with image or video managed from admin.',
  ctaText: 'Browse Shop',
  ctaUrl: '/shop',
  secondaryCtaText: 'View Deals',
  secondaryCtaUrl: '/shop?featured=true',
  isActive: false
});

const normalizeAdSlots = (input: BannerMutationDto['adSlots']) =>
  HOME_AD_SLOT_KEYS.map((slotKey) => {
    const slot = input.find((entry) => entry.slotKey === slotKey);
    const rawMediaItems = slot?.mediaItems ?? [];
    const mediaItems = rawMediaItems
      .filter((media) => Boolean(media?.url && media.publicId))
      .map((media) => ({
        kind: media.kind,
        url: media.url,
        publicId: media.publicId,
        alt: media.alt?.trim() || undefined,
        poster: media.poster
      }));

    return {
      slotKey,
      eyebrow: slot?.eyebrow?.trim() || undefined,
      title: slot?.title?.trim() || '',
      description: slot?.description?.trim() || undefined,
      ctaUrl: slot?.ctaUrl?.trim() || undefined,
      mediaItems,
      isActive: slot?.isActive ?? false
    };
  });

const normalizeFeaturePromo = (input: BannerMutationDto['featurePromo']) => {
  const rawMediaItems = input?.mediaItems ?? [];
  const mediaItems = rawMediaItems
    .filter((media) => Boolean(media?.url && media.publicId))
    .map((media) => ({
      kind: media.kind,
      url: media.url,
      publicId: media.publicId,
      alt: media.alt?.trim() || undefined,
      poster: media.poster
    }));

  return {
    eyebrow: input?.eyebrow?.trim() || undefined,
    title: input?.title?.trim() || '',
    description: input?.description?.trim() || undefined,
    ctaText: input?.ctaText?.trim() || undefined,
    ctaUrl: input?.ctaUrl?.trim() || undefined,
    secondaryCtaText: input?.secondaryCtaText?.trim() || undefined,
    secondaryCtaUrl: input?.secondaryCtaUrl?.trim() || undefined,
    mediaItems,
    isActive: input?.isActive ?? false
  };
};

const normalizeShowcaseFeatureGroups = (
  input: BannerMutationDto['showcaseFeatureGroups'] | undefined,
  showcaseProductIds: string[]
) =>
  showcaseProductIds.flatMap((productId) => {
    const group = input?.find((entry) => entry.productId === productId);
    const items = (group?.items ?? [])
      .map((item) => ({
        icon: item.icon,
        label: item.label.trim(),
        value: item.value.trim()
      }))
      .filter((item) => item.label.length > 0 && item.value.length > 0)
      .slice(0, 4);

    return items.length ? [{ productId: new Types.ObjectId(productId), items }] : [];
  });

const defaultHomeHeroBanner = (): BannerDto => ({
  id: HOME_HERO_KEY,
  key: HOME_HERO_KEY,
  campaignLabel: 'NJ Store',
  title: 'Electronics curated for premium everyday performance.',
  subtitle:
    'Flagship phones, productivity laptops, dependable printers, and refined accessories with quotation-first checkout.',
  ctaText: 'Shop Collection',
  ctaUrl: '/shop',
  accentText: 'Official warranty, fast delivery, and quotation-first checkout.',
  heroCornerImage: undefined,
  heroCornerImageEnabled: true,
  heroCornerImageSize: 108,
  heroBottomLeftImage: undefined,
  heroBottomLeftImageEnabled: true,
  heroBottomLeftImageSize: 108,
  heroBottomRightImage: undefined,
  heroBottomRightImageEnabled: true,
  heroBottomRightImageSize: 108,
  adSlots: defaultAdSlots(),
  featurePromo: defaultFeaturePromo(),
  heroSpotlightProduct: undefined,
  showcaseProducts: [],
  showcaseFeatureGroups: [],
  isActive: false
});

export const bannerService = {
  getPublicHomeHeroBanner: async (): Promise<BannerDto> => {
    await ensureLegacyHomeHeroBannerMigration();
    return cacheService.rememberVersioned(cacheNamespaces.banners, HOME_HERO_KEY, BANNER_CACHE_TTL_SECONDS, async () => {
      const banner = await Banner.findOne({ key: HOME_HERO_KEY, isActive: true })
        .select(BANNER_SELECT)
        .populate(homeHeroProductPopulate)
        .populate(showcaseProductsPopulate)
        .maxTimeMS(BANNER_QUERY_TIMEOUT_MS)
        .lean<Parameters<typeof serializeBanner>[0] | null>({ virtuals: true });
      return banner ? serializeBanner(banner) : defaultHomeHeroBanner();
    });
  },

  getAdminHomeHeroBanner: async (): Promise<BannerDto> => {
    await ensureLegacyHomeHeroBannerMigration();
    const banner = await Banner.findOne({ key: HOME_HERO_KEY })
      .select(BANNER_SELECT)
      .populate(homeHeroProductPopulate)
      .populate(showcaseProductsPopulate)
      .maxTimeMS(BANNER_QUERY_TIMEOUT_MS)
      .lean<Parameters<typeof serializeBanner>[0] | null>({ virtuals: true });
    return banner ? serializeBanner(banner) : defaultHomeHeroBanner();
  },

  upsertHomeHeroBanner: async (payload: BannerMutationDto): Promise<BannerDto> => {
    await ensureLegacyHomeHeroBannerMigration();
    const heroSpotlightProductId = payload.heroSpotlightProductId?.trim() || undefined;
    if (heroSpotlightProductId && !Types.ObjectId.isValid(heroSpotlightProductId)) {
      throw new AppError('The hero spotlight product is invalid.', 400);
    }

    const showcaseProductIds = [...new Set(payload.showcaseProductIds)].slice(0, 8);
    if (showcaseProductIds.some((id) => !Types.ObjectId.isValid(id))) {
      throw new AppError('One or more showcase products are invalid.', 400);
    }
    const showcaseFeatureGroups = payload.showcaseFeatureGroups ?? [];
    if (showcaseFeatureGroups.some((group) => !Types.ObjectId.isValid(group.productId))) {
      throw new AppError('One or more showcase feature groups are invalid.', 400);
    }
    if (showcaseFeatureGroups.some((group) => !showcaseProductIds.includes(group.productId))) {
      throw new AppError('Showcase features must belong to selected showcase products.', 400);
    }

    const heroSpotlightProduct = heroSpotlightProductId
      ? await Product.findOne({
          _id: new Types.ObjectId(heroSpotlightProductId),
          isActive: true
        }).select('_id')
          .lean()
      : null;

    if (heroSpotlightProductId && !heroSpotlightProduct) {
      throw new AppError('The hero spotlight product is unavailable.', 400);
    }

    const activeShowcaseProducts = showcaseProductIds.length
      ? await Product.find({
          _id: { $in: showcaseProductIds.map((id) => new Types.ObjectId(id)) },
          isActive: true
        })
          .select('_id')
          .lean()
      : [];

    if (activeShowcaseProducts.length !== showcaseProductIds.length) {
      throw new AppError('One or more showcase products are unavailable.', 400);
    }

    const banner = (await Banner.findOne({ key: HOME_HERO_KEY })) ?? new Banner({ key: HOME_HERO_KEY });

    banner.campaignLabel = payload.campaignLabel;
    banner.title = payload.title;
    banner.subtitle = payload.subtitle;
    banner.ctaText = payload.ctaText;
    banner.ctaUrl = payload.ctaUrl;
    banner.accentText = payload.accentText;
    banner.set('heroCornerImage', payload.heroCornerImage ?? null);
    banner.set('heroCornerImageEnabled', payload.heroCornerImageEnabled ?? true);
    banner.set('heroCornerImageSize', payload.heroCornerImageSize ?? 108);
    banner.set('heroBottomLeftImage', payload.heroBottomLeftImage ?? null);
    banner.set('heroBottomLeftImageEnabled', payload.heroBottomLeftImageEnabled ?? true);
    banner.set('heroBottomLeftImageSize', payload.heroBottomLeftImageSize ?? 108);
    banner.set('heroBottomRightImage', payload.heroBottomRightImage ?? null);
    banner.set('heroBottomRightImageEnabled', payload.heroBottomRightImageEnabled ?? true);
    banner.set('heroBottomRightImageSize', payload.heroBottomRightImageSize ?? 108);
    banner.set('backgroundImage', payload.backgroundImage ?? null);
    banner.set('adSlots', normalizeAdSlots(payload.adSlots));
    banner.set('featurePromo', normalizeFeaturePromo(payload.featurePromo));
    banner.set('heroSpotlightProduct', heroSpotlightProduct?._id ?? null);
    banner.set(
      'showcaseProducts',
      showcaseProductIds.map((id) => new Types.ObjectId(id))
    );
    banner.set('showcaseFeatureGroups', normalizeShowcaseFeatureGroups(showcaseFeatureGroups, showcaseProductIds));
    banner.isActive = payload.isActive;

    await banner.save();
    await cacheService.bumpNamespace(cacheNamespaces.banners);

    const populatedBanner = await Banner.findById(banner._id)
      .select(BANNER_SELECT)
      .populate(homeHeroProductPopulate)
      .populate(showcaseProductsPopulate)
      .maxTimeMS(BANNER_QUERY_TIMEOUT_MS)
      .lean<Parameters<typeof serializeBanner>[0] | null>({ virtuals: true });

    return populatedBanner ? serializeBanner(populatedBanner) : serializeBanner(banner.toObject());
  }
};
