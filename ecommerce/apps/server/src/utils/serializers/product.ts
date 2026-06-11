import type {
  CompareListDto,
  ProductBundleItemDto,
  ProductCardDto,
  ProductComparisonDto,
  ProductDetailDto,
  ProductSuggestionDto,
  ReviewDto,
  WishlistDto
} from '@njstore/types';
import { type CategoryLike, serializeBrand, serializeCategory } from './catalog.js';
import {
  applyBrandLogoBadgeTransform,
  hasObjectId,
  type BrandLike,
  type DateLike,
  type IdValue,
  type ImageLike,
  isDateLike,
  isDefined,
  serializeProductImage,
  toId
} from './helpers.js';

type ProductCardLike = {
  _id: IdValue;
  name: string;
  slug: string;
  shortDescription: string;
  price: number;
  comparePrice?: number | null;
  images?: ImageLike[];
  category?: CategoryLike;
  brand?: BrandLike | string | null;
  brandName?: string | null;
  condition?: ProductCardDto['condition'];
  ratings: { average: number; count: number };
  isBestSeller: boolean;
  isFeatured: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: DateLike | null;
  isActive: boolean;
  publishAt?: Date | string | null;
  bundleStock?: number | null;
  variants: Array<{ color?: string | null; colorCode?: string | null; stock: number }>;
  discountPercentage?: number;
  productType?: ProductCardDto['productType'];
};

interface SerializeProductCardOptions {
  previewImageLimit?: number;
}

type ProductDetailLike = Omit<ProductCardLike, 'variants'> & {
  description: string;
  variants: Array<{
    color?: string;
    colorCode?: string;
    storage?: string;
    model?: string;
    attributes?: Array<{ name: string; value: string }>;
    glowColor?: string;
    images?: ImageLike[];
    price?: number;
    stock: number;
    sku: string;
  }>;
  specifications: Array<{ key: string; value: string }>;
  tags: string[];
  loyaltyPoints: number;
  sku: string;
  weight?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  warranty?: string | null;
  videoUrl?: string | null;
  bundleItems?: Array<{
    product: IdValue | { _id: IdValue; name: string; slug: string; images?: ImageLike[]; sku: string };
    quantity: number;
    variantIndex?: number;
    variantLabel?: string;
    name?: string;
    slug?: string;
    image?: ImageLike;
    sku?: string;
  }>;
};

type SuggestionLike = {
  _id: IdValue;
  name: string;
  slug: string;
  price: number;
  images?: ImageLike[];
  variants?: Array<{ color?: string | null; colorCode?: string | null; images?: ImageLike[]; stock: number }>;
};

type ComparisonLike = {
  _id: IdValue;
  name: string;
  brand?: BrandLike | string | null;
  brandName?: string | null;
  price: number;
  comparePrice?: number | null;
  ratings: { average: number; count: number };
  images?: ImageLike[];
  specifications: Array<{ key: string; value: string }>;
};

type ReviewLike = {
  _id: IdValue;
  product: IdValue | { _id: IdValue; name?: string };
  user: { _id: IdValue; name: string };
  order: IdValue;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  isVerifiedBuyer?: boolean;
  isApproved: boolean;
  helpfulVotes: number;
  adminReply?: string | null;
  adminRepliedAt?: DateLike | null;
  createdAt: DateLike;
};

const resolveProductBrand = (product: {
  brand?: BrandLike | string | null;
  brandName?: string | null;
}) => {
  const serializedBrand = typeof product.brand === 'string' ? undefined : serializeBrand(product.brand);
  const brandLogoUrl = product.brand && typeof product.brand !== 'string' && product.brand.logo?.url
    ? applyBrandLogoBadgeTransform(product.brand.logo.url)
    : serializedBrand?.logoUrl;

  return {
    brandLabel: serializedBrand?.name ?? product.brandName ?? (typeof product.brand === 'string' ? product.brand : undefined) ?? 'Unbranded',
    brandId: serializedBrand?.id ?? null,
    brandSlug: serializedBrand?.slug ?? null,
    brandLogoUrl
  };
};

const normalizeVariantText = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeVariantHexColor = (value?: string | null): string | undefined => {
  const normalized = normalizeVariantText(value);
  return normalized && /^#(?:[0-9A-Fa-f]{3}){1,2}$/.test(normalized) ? normalized : undefined;
};

const serializeProductColorVariants = (variants: ProductCardLike['variants']): NonNullable<ProductCardDto['colorVariants']> => {
  const seen = new Set<string>();
  const colorVariants: NonNullable<ProductCardDto['colorVariants']> = [];

  variants.forEach((variant) => {
    const name = normalizeVariantText(variant.color);
    const colorCode = normalizeVariantHexColor(variant.colorCode);

    if (!name && !colorCode) {
      return;
    }

    const label = name ?? colorCode ?? 'Color';
    const key = `${label.toLowerCase()}|${colorCode ?? ''}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    colorVariants.push({
      name: label,
      colorCode
    });
  });

  return colorVariants.slice(0, 6);
};

const hasBundleItemProductShape = (
  value: unknown
): value is { _id: IdValue; name: string; slug: string; images?: ImageLike[]; sku: string } =>
  Boolean(
    value &&
      typeof value === 'object' &&
      '_id' in value &&
      'name' in value &&
      'slug' in value &&
      'sku' in value
  );

const serializeBundleItem = (item: NonNullable<ProductDetailLike['bundleItems']>[number]): ProductBundleItemDto | undefined => {
  const product = hasBundleItemProductShape(item.product) ? item.product : undefined;
  const productId = hasBundleItemProductShape(item.product) ? item.product._id : item.product;
  const name = item.name ?? product?.name;
  const slug = item.slug ?? product?.slug;
  const sku = item.sku ?? product?.sku;
  const variant =
    product && item.variantIndex !== undefined && 'variants' in product && Array.isArray((product as any).variants)
      ? (product as any).variants[item.variantIndex]
      : undefined;

  if (!name || !slug || !sku) {
    return undefined;
  }

  return {
    product: toId(productId),
    name,
    slug,
    image: serializeProductImage(item.image ?? product?.images?.[0], 'thumbnail'),
    sku,
    quantity: item.quantity,
    variantIndex: item.variantIndex,
    variantLabel:
      item.variantLabel ?? ([variant?.color, variant?.storage, variant?.model].filter(Boolean).join(' / ') || undefined)
  };
};

export const serializeProductCard = (product: ProductCardLike, options: SerializeProductCardOptions = {}): ProductCardDto => {
  const brand = resolveProductBrand(product);
  const previewImageLimit = Math.max(1, Math.min(4, options.previewImageLimit ?? 4));
  const stock =
    product.productType === 'bundle'
      ? product.bundleStock ?? 0
      : product.variants.reduce((sum, variant) => sum + variant.stock, 0);

  return {
    id: toId(product._id),
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    price: product.price,
    comparePrice: product.comparePrice,
    thumbnail: serializeProductImage(product.images?.[0], 'thumbnail'),
    previewImages: product.images?.map((image) => serializeProductImage(image, 'card')).filter(isDefined).slice(0, previewImageLimit),
    category: product.category ? serializeCategory(product.category) : undefined,
    brand: brand.brandLabel,
    brandId: brand.brandId,
    brandSlug: brand.brandSlug,
    brandLogoUrl: brand.brandLogoUrl,
    condition: product.condition ?? 'new',
    ratings: product.ratings,
    isBestSeller: product.isBestSeller,
    isFeatured: product.isFeatured,
    isFlashDeal: product.isFlashDeal ?? false,
    flashDealEndsAt: product.flashDealEndsAt?.toISOString(),
    isActive: product.isActive,
    publishAt: product.publishAt ? new Date(product.publishAt).toISOString() : undefined,
    stock,
    productType: product.productType ?? 'standard',
    discountPercentage:
      product.discountPercentage ??
      (product.comparePrice && product.comparePrice > product.price
        ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
        : 0),
    colorVariants: serializeProductColorVariants(product.variants)
  };
};

export const serializeProductDetail = (product: ProductDetailLike): ProductDetailDto => ({
  ...serializeProductCard(product),
  description: product.description,
  images: product.images?.map((image) => serializeProductImage(image, 'detail')).filter(isDefined),
  variants: product.variants.map((variant) => ({
    color: variant.color,
    colorCode: variant.colorCode,
    storage: variant.storage,
    model: variant.model,
    attributes: variant.attributes?.map((attribute) => ({ name: attribute.name, value: attribute.value })) ?? [],
    glowColor: variant.glowColor ?? undefined,
    images: variant.images?.map((image) => serializeProductImage(image, 'detail')).filter(isDefined),
    price: variant.price,
    stock: variant.stock,
    sku: variant.sku
  })),
  specifications: product.specifications,
  tags: product.tags,
  loyaltyPoints: product.loyaltyPoints,
  sku: product.sku,
  weight: product.weight,
  metaTitle: product.metaTitle ?? undefined,
  metaDescription: product.metaDescription ?? undefined,
  canonicalUrl: product.canonicalUrl ?? undefined,
  warranty: product.warranty ?? undefined,
  videoUrl: product.videoUrl ?? undefined,
  bundleItems: (product.bundleItems ?? []).map((item) => serializeBundleItem(item)).filter(isDefined)
});

const getProductSuggestionImage = (product: SuggestionLike): ImageLike =>
  product.images?.[0] ?? product.variants?.find((variant) => variant.images?.[0])?.images?.[0];

export const serializeSuggestion = (product: SuggestionLike): ProductSuggestionDto => ({
  id: toId(product._id),
  name: product.name,
  slug: product.slug,
  price: product.price,
  thumbnail: serializeProductImage(getProductSuggestionImage(product), 'thumbnail'),
  colorVariants: serializeProductColorVariants(product.variants ?? [])
});

export const serializeComparison = (product: ComparisonLike): ProductComparisonDto => {
  const brand = resolveProductBrand(product);

  return {
    id: toId(product._id),
    name: product.name,
    brand: brand.brandLabel,
    brandId: brand.brandId,
    brandSlug: brand.brandSlug,
    brandLogoUrl: brand.brandLogoUrl,
    price: product.price,
    comparePrice: product.comparePrice,
    ratings: product.ratings,
    thumbnail: serializeProductImage(product.images?.[0], 'thumbnail'),
    specifications: product.specifications
  };
};

const hasNamedObjectId = (value: unknown): value is { _id: IdValue; name: string } =>
  hasObjectId(value) && 'name' in value && typeof value.name === 'string';

export const serializeReview = (review: ReviewLike, options?: { viewerHasHelpfulVote?: boolean }): ReviewDto => {
  const productId = hasObjectId(review.product) ? review.product._id : review.product;
  const productName = hasNamedObjectId(review.product) ? review.product.name : undefined;

  return {
    id: toId(review._id),
    product: toId(productId),
    productName,
    user: {
      id: toId(review.user._id),
      name: review.user.name
    },
    order: toId(review.order),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    isVerified: review.isVerified,
    isVerifiedBuyer: review.isVerifiedBuyer ?? false,
    isApproved: review.isApproved,
    helpfulVotes: review.helpfulVotes,
    viewerHasHelpfulVote: options?.viewerHasHelpfulVote,
    adminReply: review.adminReply ?? undefined,
    adminRepliedAt: isDateLike(review.adminRepliedAt) ? review.adminRepliedAt.toISOString() : undefined,
    createdAt: review.createdAt.toISOString()
  };
};

export const serializeWishlist = (items: IdValue[]): WishlistDto => ({
  items: items.map((item) => toId(item))
});

export const serializeCompareList = (items: IdValue[]): CompareListDto => ({
  items: items.map((item) => toId(item))
});
