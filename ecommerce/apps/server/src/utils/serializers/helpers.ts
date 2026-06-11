import type { Types } from 'mongoose';

export type IdValue = Types.ObjectId | string;
export type DateLike = { toISOString: () => string };
export type ImageLike = { url: string; publicId: string; alt?: string | null } | null | undefined;
export type BannerMediaLike =
  | {
      kind: 'image' | 'video';
      url: string;
      publicId: string;
      alt?: string | null;
      poster?: ImageLike;
    }
  | null
  | undefined;
export type BannerMediaCollectionLike = BannerMediaLike[] | null | undefined;
export type BrandLike =
  | {
      _id: IdValue;
      name: string;
      slug: string;
      logo?: ImageLike;
      description?: string | null;
      isActive: boolean;
      sortOrder: number;
      createdAt: DateLike;
      updatedAt: DateLike;
      productCount?: number;
    }
  | null
  | undefined;
export type AdminOrderCustomerShape = {
  _id: IdValue;
  name: string;
  email: string;
  phone?: string | null;
  isEmailVerified: boolean;
};
export type AdminOrderAssigneeShape = {
  _id: IdValue;
  name: string;
  email: string;
};
export type ProductImageVariant = 'thumbnail' | 'card' | 'detail';

export const toId = (value: IdValue | null | undefined): string => (value ? value.toString() : '');

export const hasObjectId = (value: unknown): value is { _id: IdValue } =>
  Boolean(value && typeof value === 'object' && '_id' in value);

export const isDateLike = (value: unknown): value is DateLike =>
  Boolean(value && typeof value === 'object' && 'toISOString' in value && typeof value.toISOString === 'function');

export const isDefined = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null;

export const isKnownUnavailableDemoAssetUrl = (url?: string | null): boolean => {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'res.cloudinary.com' && parsedUrl.pathname.startsWith('/demo/') && parsedUrl.pathname.includes('/njstore/');
  } catch {
    return url.includes('res.cloudinary.com/demo/') && url.includes('/njstore/');
  }
};

const replaceCloudinaryUploadTransform = (url: string, transform: string): string => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  if (url.includes(`/upload/${transform}/`)) {
    return url;
  }

  const [prefix, suffix] = url.split('/upload/', 2);
  if (!prefix || !suffix) {
    return url;
  }

  const versionedAssetMatch = suffix.match(/(?:^|\/)(v\d+\/.*)$/);
  const assetPath = versionedAssetMatch?.[1] ?? suffix.replace(/^\/+/, '');

  return `${prefix}/upload/${transform}/${assetPath}`;
};

const applyCloudinaryTransform = (url: string): string => replaceCloudinaryUploadTransform(url, 'f_auto,q_auto,w_800');

export const applyBrandLogoTransform = (url: string): string =>
  replaceCloudinaryUploadTransform(url, 'f_auto,q_auto,e_trim,c_limit,w_480,h_192');

export const applyBrandLogoBadgeTransform = (url: string): string =>
  replaceCloudinaryUploadTransform(url, 'f_auto,q_auto,e_trim,c_limit,w_192,h_96');

const storeLogoWidths = [220, 360, 560];
const storeLogoSizes = '(min-width: 1024px) 11.5rem, (min-width: 640px) 10.5rem, 9rem';
const buildStoreLogoTransform = (width: number): string => `f_auto,q_auto,e_trim,c_limit,w_${width},h_180`;

const buildStoreLogoSrcSet = (url: string): string | undefined => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return undefined;
  }

  return storeLogoWidths
    .map((width) => `${replaceCloudinaryUploadTransform(url, buildStoreLogoTransform(width))} ${width}w`)
    .join(', ');
};

export const applyStoreLogoTransform = (url: string): string =>
  replaceCloudinaryUploadTransform(url, buildStoreLogoTransform(storeLogoWidths[storeLogoWidths.length - 1] ?? 560));

const productImageVariantConfig: Record<
  ProductImageVariant,
  {
    widths: number[];
    sizes: string;
  }
> = {
  thumbnail: {
    widths: [160, 240, 320],
    sizes: '(min-width: 1280px) 320px, (min-width: 768px) 240px, 45vw'
  },
  card: {
    widths: [320, 480, 720],
    sizes: '(max-width: 767px) 46vw, (min-width: 1280px) 22vw, 44vw'
  },
  detail: {
    widths: [640, 960, 1400],
    sizes: '(min-width: 1280px) 52vw, (min-width: 1024px) 46vw, 94vw'
  }
};

const buildProductImageTransform = (width: number): string => `f_auto,q_auto,e_trim,c_fit,w_${width},h_${width}`;

const buildProductImageSrcSet = (url: string, variant: ProductImageVariant): string | undefined => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return undefined;
  }

  return productImageVariantConfig[variant].widths
    .map((width) => `${replaceCloudinaryUploadTransform(url, buildProductImageTransform(width))} ${width}w`)
    .join(', ');
};

const applyProductImageTransform = (url: string, variant: ProductImageVariant): string => {
  const widths = productImageVariantConfig[variant].widths;
  return replaceCloudinaryUploadTransform(url, buildProductImageTransform(widths[widths.length - 1] ?? 1400));
};

export const serializeImage = (image?: ImageLike) =>
  image
    ? {
        url: applyCloudinaryTransform(image.url),
        publicId: image.publicId,
        alt: image.alt ?? undefined
      }
    : undefined;

export const serializeStoreLogo = (image?: ImageLike) =>
  image
    ? {
        url: applyStoreLogoTransform(image.url),
        publicId: image.publicId,
        alt: image.alt ?? undefined,
        srcSet: buildStoreLogoSrcSet(image.url),
        sizes: storeLogoSizes
      }
    : undefined;

export const serializeProductImage = (image: ImageLike, variant: ProductImageVariant) =>
  image
    ? {
        url: applyProductImageTransform(image.url, variant),
        publicId: image.publicId,
        alt: image.alt ?? undefined,
        srcSet: buildProductImageSrcSet(image.url, variant),
        sizes: productImageVariantConfig[variant].sizes
      }
    : undefined;

const serializeBannerMedia = (media?: BannerMediaLike) =>
  media
    ? {
        kind: media.kind,
        url: media.kind === 'image' ? applyCloudinaryTransform(media.url) : media.url,
        publicId: media.publicId,
        alt: media.alt ?? undefined,
        poster: serializeImage(media.poster)
      }
    : undefined;

export const serializeBannerMediaItems = (mediaItems?: BannerMediaCollectionLike) =>
  (mediaItems ?? []).map((media) => serializeBannerMedia(media)).filter(isDefined);
