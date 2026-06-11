import { serializeProductCard } from './product.js';
import { isKnownUnavailableDemoAssetUrl, serializeBannerMediaItems, serializeImage, serializeStoreLogo, toId } from './helpers.js';
import { buildDefaultFooterSettings, buildFooterMapEmbedUrl, defaultFooterQuickLinks, defaultFooterSectionTitles, defaultFooterSocialLinks } from '../footerDefaults.js';
const trimText = (value) => value?.trim() ?? '';
const serializeSocialLinks = (socialLinks) => {
    const defaults = defaultFooterSocialLinks();
    return {
        facebook: trimText(socialLinks?.facebook) || defaults.facebook,
        instagram: trimText(socialLinks?.instagram) || defaults.instagram,
        tiktok: trimText(socialLinks?.tiktok) || defaults.tiktok,
        youtube: trimText(socialLinks?.youtube) || defaults.youtube,
        x: trimText(socialLinks?.x) || defaults.x
    };
};
const isBannerProductLike = (value) => Boolean(value &&
    typeof value === 'object' &&
    '_id' in value &&
    'name' in value &&
    typeof value.name === 'string' &&
    'slug' in value &&
    typeof value.slug === 'string' &&
    'shortDescription' in value &&
    typeof value.shortDescription === 'string' &&
    'price' in value &&
    typeof value.price === 'number' &&
    'ratings' in value &&
    typeof value.ratings === 'object' &&
    value.ratings !== null &&
    'average' in value.ratings &&
    typeof value.ratings.average === 'number' &&
    'count' in value.ratings &&
    typeof value.ratings.count === 'number' &&
    'isBestSeller' in value &&
    typeof value.isBestSeller === 'boolean' &&
    'isFeatured' in value &&
    typeof value.isFeatured === 'boolean' &&
    'isActive' in value &&
    typeof value.isActive === 'boolean' &&
    'variants' in value &&
    Array.isArray(value.variants));
const serializePublicBannerImage = (image) => image && !isKnownUnavailableDemoAssetUrl(image.url) ? serializeImage(image) : undefined;
const serializePublicBannerMediaItems = (mediaItems) => serializeBannerMediaItems(mediaItems).filter((media) => !isKnownUnavailableDemoAssetUrl(media.url));
export const serializeBanner = (banner) => ({
    id: banner._id ? toId(banner._id) : banner.key,
    key: banner.key === 'home-hero' ? banner.key : 'home-hero',
    campaignLabel: banner.campaignLabel,
    title: banner.title,
    subtitle: banner.subtitle,
    ctaText: banner.ctaText,
    ctaUrl: banner.ctaUrl,
    accentText: banner.accentText ?? undefined,
    heroCornerImage: serializePublicBannerImage(banner.heroCornerImage),
    heroCornerImageEnabled: banner.heroCornerImageEnabled ?? true,
    heroCornerImageSize: banner.heroCornerImageSize ?? 108,
    heroBottomLeftImage: serializePublicBannerImage(banner.heroBottomLeftImage),
    heroBottomLeftImageEnabled: banner.heroBottomLeftImageEnabled ?? true,
    heroBottomLeftImageSize: banner.heroBottomLeftImageSize ?? 108,
    heroBottomRightImage: serializePublicBannerImage(banner.heroBottomRightImage),
    heroBottomRightImageEnabled: banner.heroBottomRightImageEnabled ?? true,
    heroBottomRightImageSize: banner.heroBottomRightImageSize ?? 108,
    backgroundImage: serializePublicBannerImage(banner.backgroundImage),
    adSlots: (banner.adSlots ?? []).map((slot) => {
        const mediaItems = serializePublicBannerMediaItems(slot.mediaItems?.length ? slot.mediaItems : slot.media ? [slot.media] : []);
        return {
            slotKey: slot.slotKey,
            eyebrow: slot.eyebrow ?? undefined,
            title: slot.title ?? '',
            description: slot.description ?? undefined,
            ctaUrl: slot.ctaUrl ?? undefined,
            mediaItems,
            isActive: slot.isActive
        };
    }),
    featurePromo: banner.featurePromo
        ? (() => {
            const mediaItems = serializePublicBannerMediaItems(banner.featurePromo.mediaItems?.length ? banner.featurePromo.mediaItems : banner.featurePromo.media ? [banner.featurePromo.media] : []);
            return {
                eyebrow: banner.featurePromo.eyebrow ?? undefined,
                title: banner.featurePromo.title ?? '',
                description: banner.featurePromo.description ?? undefined,
                ctaText: banner.featurePromo.ctaText ?? undefined,
                ctaUrl: banner.featurePromo.ctaUrl ?? undefined,
                secondaryCtaText: banner.featurePromo.secondaryCtaText ?? undefined,
                secondaryCtaUrl: banner.featurePromo.secondaryCtaUrl ?? undefined,
                mediaItems,
                isActive: banner.featurePromo.isActive
            };
        })()
        : undefined,
    heroSpotlightProduct: isBannerProductLike(banner.heroSpotlightProduct) ? serializeProductCard(banner.heroSpotlightProduct) : undefined,
    showcaseProducts: (banner.showcaseProducts ?? []).filter(isBannerProductLike).map((product) => serializeProductCard(product)),
    showcaseFeatureGroups: (banner.showcaseFeatureGroups ?? [])
        .map((group) => ({
        productId: toId(group.productId),
        items: (group.items ?? []).map((item) => ({
            icon: item.icon,
            label: item.label,
            value: item.value
        }))
    }))
        .filter((group) => group.items.length > 0),
    isActive: banner.isActive,
    updatedAt: banner.updatedAt?.toISOString()
});
export const serializeFooterSettings = (config) => {
    const defaults = buildDefaultFooterSettings();
    const footer = config.footer;
    const quickLinks = (footer?.quickLinks ?? [])
        .map((link) => ({
        label: trimText(link.label),
        href: trimText(link.href)
    }))
        .filter((link) => link.label && link.href);
    return {
        companyName: trimText(footer?.companyName) || trimText(config.storeName) || defaults.companyName,
        logo: footer?.logo?.url && footer?.logo?.publicId
            ? serializeImage({
                url: footer.logo.url,
                publicId: footer.logo.publicId,
                alt: footer.logo.alt
            })
            : undefined,
        description: trimText(footer?.description) || defaults.description,
        email: trimText(footer?.email) || defaults.email,
        phone: trimText(footer?.phone) || trimText(config.supportPhoneNumber) || defaults.phone,
        whatsappNumber: trimText(footer?.whatsappNumber) || trimText(config.whatsappNumber) || defaults.whatsappNumber,
        physicalAddress: trimText(footer?.physicalAddress) || defaults.physicalAddress,
        mapEmbedUrl: buildFooterMapEmbedUrl({
            mapEmbedUrl: footer?.mapEmbedUrl,
            latitude: footer?.latitude,
            longitude: footer?.longitude,
            physicalAddress: footer?.physicalAddress
        }),
        latitude: typeof footer?.latitude === 'number' ? footer.latitude : undefined,
        longitude: typeof footer?.longitude === 'number' ? footer.longitude : undefined,
        openingHours: trimText(footer?.openingHours) || defaults.openingHours,
        copyrightText: trimText(footer?.copyrightText) || defaults.copyrightText,
        socialLinks: serializeSocialLinks(footer?.socialLinks ?? config.socialLinks),
        sectionTitles: {
            about: trimText(footer?.sectionTitles?.about) || defaultFooterSectionTitles().about,
            quickLinks: trimText(footer?.sectionTitles?.quickLinks) || defaultFooterSectionTitles().quickLinks,
            contact: trimText(footer?.sectionTitles?.contact) || defaultFooterSectionTitles().contact,
            social: trimText(footer?.sectionTitles?.social) || defaultFooterSectionTitles().social
        },
        quickLinks: quickLinks.length > 0 ? quickLinks : defaultFooterQuickLinks()
    };
};
export const serializeSiteConfig = (config) => ({
    ...(() => {
        const footer = serializeFooterSettings(config);
        return {
            footer,
            supportPhoneNumber: footer.phone,
            whatsappNumber: footer.whatsappNumber,
            socialLinks: footer.socialLinks
        };
    })(),
    id: toId(config._id),
    revision: config.revision ?? config.__v ?? 0,
    storeName: config.storeName,
    storeLogo: config.storeLogo?.url && config.storeLogo?.publicId
        ? serializeStoreLogo({
            url: config.storeLogo.url,
            publicId: config.storeLogo.publicId,
            alt: config.storeLogo.alt ?? undefined
        })
        : undefined,
    storeLogoDark: config.storeLogoDark?.url && config.storeLogoDark?.publicId
        ? serializeStoreLogo({
            url: config.storeLogoDark.url,
            publicId: config.storeLogoDark.publicId,
            alt: config.storeLogoDark.alt ?? undefined
        })
        : undefined,
    storeLogoLight: config.storeLogoLight?.url && config.storeLogoLight?.publicId
        ? serializeStoreLogo({
            url: config.storeLogoLight.url,
            publicId: config.storeLogoLight.publicId,
            alt: config.storeLogoLight.alt ?? undefined
        })
        : undefined,
    freeShippingThreshold: config.freeShippingThreshold,
    lowStockThreshold: config.lowStockThreshold,
    loyaltyPointsRate: config.loyaltyPointsRate,
    cancellationWindowHours: config.cancellationWindowHours,
    quotationExpiryDays: config.quotationExpiryDays,
    cashOnDeliveryEnabled: config.cashOnDeliveryEnabled ?? true,
    shippingRates: config.shippingRates,
    bankTransferDetails: config.bankTransferDetails ?? {
        accountName: '',
        bankName: '',
        branch: '',
        accountNumber: ''
    },
    emailTemplates: config.emailTemplates ?? [],
    supportedCurrencies: (() => {
        const normalized = (config.supportedCurrencies ?? [])
            .map((currency) => ({
            code: currency.code?.trim().toUpperCase() || '',
            symbol: currency.symbol?.trim() || '',
            rate: currency.code?.trim().toUpperCase() === 'LKR' ? 1 : Math.max(currency.rate ?? 1, 0.0001),
            isDefault: Boolean(currency.isDefault)
        }))
            .filter((currency) => currency.code && currency.symbol);
        const unique = normalized.filter((currency, index, entries) => entries.findIndex((entry) => entry.code === currency.code) === index);
        if (!unique.some((currency) => currency.code === 'LKR')) {
            unique.unshift({ code: 'LKR', symbol: 'LKR', rate: 1, isDefault: unique.length === 0 });
        }
        const currencies = unique.map((currency) => currency.code === 'LKR'
            ? {
                ...currency,
                rate: 1
            }
            : currency);
        const defaultCurrencyIndex = currencies.findIndex((currency) => currency.isDefault);
        const resolvedDefaultIndex = defaultCurrencyIndex >= 0 ? defaultCurrencyIndex : 0;
        return currencies.map((currency, index) => ({
            ...currency,
            isDefault: index === resolvedDefaultIndex
        }));
    })(),
    maintenanceMode: {
        enabled: config.maintenanceMode?.enabled ?? false,
        message: config.maintenanceMode?.message?.trim() || "We're making a few improvements right now. Please check back shortly."
    },
    taxSettings: {
        enabled: config.taxSettings?.enabled ?? false,
        label: config.taxSettings?.label?.trim() || 'VAT',
        rate: config.taxSettings?.rate ?? 0
    },
    notificationSettings: {
        quotationReady: {
            emailEnabled: config.notificationSettings?.quotationReady?.emailEnabled ?? true,
            smsEnabled: config.notificationSettings?.quotationReady?.smsEnabled ?? false
        },
        orderConfirmed: {
            emailEnabled: config.notificationSettings?.orderConfirmed?.emailEnabled ?? true,
            smsEnabled: config.notificationSettings?.orderConfirmed?.smsEnabled ?? false
        },
        orderShipped: {
            emailEnabled: config.notificationSettings?.orderShipped?.emailEnabled ?? true,
            smsEnabled: config.notificationSettings?.orderShipped?.smsEnabled ?? false
        },
        receiptRejected: {
            emailEnabled: config.notificationSettings?.receiptRejected?.emailEnabled ?? true,
            smsEnabled: config.notificationSettings?.receiptRejected?.smsEnabled ?? false
        },
        lowStockAlert: {
            emailEnabled: config.notificationSettings?.lowStockAlert?.emailEnabled ?? true,
            smsEnabled: config.notificationSettings?.lowStockAlert?.smsEnabled ?? false
        }
    }
});
