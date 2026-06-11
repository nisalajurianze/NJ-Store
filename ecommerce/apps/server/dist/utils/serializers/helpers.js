export const toId = (value) => (value ? value.toString() : '');
export const hasObjectId = (value) => Boolean(value && typeof value === 'object' && '_id' in value);
export const isDateLike = (value) => Boolean(value && typeof value === 'object' && 'toISOString' in value && typeof value.toISOString === 'function');
export const isDefined = (value) => value !== undefined && value !== null;
export const isKnownUnavailableDemoAssetUrl = (url) => {
    if (!url) {
        return false;
    }
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname === 'res.cloudinary.com' && parsedUrl.pathname.startsWith('/demo/') && parsedUrl.pathname.includes('/njstore/');
    }
    catch {
        return url.includes('res.cloudinary.com/demo/') && url.includes('/njstore/');
    }
};
const replaceCloudinaryUploadTransform = (url, transform) => {
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
const applyCloudinaryTransform = (url) => replaceCloudinaryUploadTransform(url, 'f_auto,q_auto,w_800');
export const applyBrandLogoTransform = (url) => replaceCloudinaryUploadTransform(url, 'f_auto,q_auto,e_trim,c_limit,w_480,h_192');
export const applyBrandLogoBadgeTransform = (url) => replaceCloudinaryUploadTransform(url, 'f_auto,q_auto,e_trim,c_limit,w_192,h_96');
const storeLogoWidths = [220, 360, 560];
const storeLogoSizes = '(min-width: 1024px) 11.5rem, (min-width: 640px) 10.5rem, 9rem';
const buildStoreLogoTransform = (width) => `f_auto,q_auto,e_trim,c_limit,w_${width},h_180`;
const buildStoreLogoSrcSet = (url) => {
    if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
        return undefined;
    }
    return storeLogoWidths
        .map((width) => `${replaceCloudinaryUploadTransform(url, buildStoreLogoTransform(width))} ${width}w`)
        .join(', ');
};
export const applyStoreLogoTransform = (url) => replaceCloudinaryUploadTransform(url, buildStoreLogoTransform(storeLogoWidths[storeLogoWidths.length - 1] ?? 560));
const productImageVariantConfig = {
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
const buildProductImageTransform = (width) => `f_auto,q_auto,e_trim,c_fit,w_${width},h_${width}`;
const buildProductImageSrcSet = (url, variant) => {
    if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
        return undefined;
    }
    return productImageVariantConfig[variant].widths
        .map((width) => `${replaceCloudinaryUploadTransform(url, buildProductImageTransform(width))} ${width}w`)
        .join(', ');
};
const applyProductImageTransform = (url, variant) => {
    const widths = productImageVariantConfig[variant].widths;
    return replaceCloudinaryUploadTransform(url, buildProductImageTransform(widths[widths.length - 1] ?? 1400));
};
export const serializeImage = (image) => image
    ? {
        url: applyCloudinaryTransform(image.url),
        publicId: image.publicId,
        alt: image.alt ?? undefined
    }
    : undefined;
export const serializeStoreLogo = (image) => image
    ? {
        url: applyStoreLogoTransform(image.url),
        publicId: image.publicId,
        alt: image.alt ?? undefined,
        srcSet: buildStoreLogoSrcSet(image.url),
        sizes: storeLogoSizes
    }
    : undefined;
export const serializeProductImage = (image, variant) => image
    ? {
        url: applyProductImageTransform(image.url, variant),
        publicId: image.publicId,
        alt: image.alt ?? undefined,
        srcSet: buildProductImageSrcSet(image.url, variant),
        sizes: productImageVariantConfig[variant].sizes
    }
    : undefined;
const serializeBannerMedia = (media) => media
    ? {
        kind: media.kind,
        url: media.kind === 'image' ? applyCloudinaryTransform(media.url) : media.url,
        publicId: media.publicId,
        alt: media.alt ?? undefined,
        poster: serializeImage(media.poster)
    }
    : undefined;
export const serializeBannerMediaItems = (mediaItems) => (mediaItems ?? []).map((media) => serializeBannerMedia(media)).filter(isDefined);
