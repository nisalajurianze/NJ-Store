import { Types } from 'mongoose';
import { slugify } from '@njstore/utils';
import { Category } from '../models/Category.js';
import { Cart } from '../models/Cart.js';
import { CompareList } from '../models/CompareList.js';
import { Order } from '../models/Order.js';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { Wishlist } from '../models/Wishlist.js';
import { backInStockService } from './backInStockService.js';
import { bannerService } from './bannerService.js';
import { brandService } from './brandService.js';
import { bundleService } from './bundleService.js';
import { customerBehaviorService } from './customerBehaviorService.js';
import { inventoryBroadcastService } from './inventoryBroadcastService.js';
import { cacheKeys, cacheNamespaces, cacheService, buildStableCacheSuffix, invalidateInventoryDerivedCaches } from './cacheService.js';
import { buildProductVersionSnapshot, productVersionService } from './productVersionService.js';
import { AppError } from '../utils/AppError.js';
import { createPagination } from '../utils/pagination.js';
import { buildSafeRegex } from '../utils/regex.js';
import { serializeComparison, serializeProductCard, serializeProductDetail, serializeSuggestion } from '../utils/serializers.js';
const PRODUCT_LIST_CACHE_TTL_SECONDS = 180;
const PRODUCT_DETAIL_CACHE_TTL_SECONDS = 600;
const PRODUCT_SUGGESTION_CACHE_TTL_SECONDS = 60;
const HOME_PUBLIC_FEED_CACHE_TTL_SECONDS = 180;
const BRAND_LOOKUP_CACHE_TTL_SECONDS = 300;
const CATEGORY_SLUG_CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes
const PUBLIC_PRODUCT_QUERY_TIMEOUT_MS = 5_000;
const PRODUCT_CARD_IMAGE_LIMIT = 4;
const PRODUCT_LIST_IMAGE_LIMIT = 2;
const PRODUCT_CARD_SELECT = [
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
const PRODUCT_DETAIL_SELECT = [
    PRODUCT_CARD_SELECT,
    'description',
    'variants.storage',
    'variants.model',
    'variants.attributes',
    'variants.glowColor',
    'variants.images',
    'variants.price',
    'variants.sku',
    'specifications',
    'tags',
    'loyaltyPoints',
    'sku',
    'weight',
    'metaTitle',
    'metaDescription',
    'canonicalUrl',
    'warranty',
    'videoUrl',
    'bundleItems'
].join(' ');
const PRODUCT_SUGGESTION_SELECT = '_id name slug price images variants.color variants.colorCode variants.images variants.stock';
const PRODUCT_COMPARISON_SELECT = '_id name brand brandName price comparePrice ratings images specifications';
const CATEGORY_CARD_SELECT = '_id name slug image';
const CATEGORY_TEXT_SELECT = '_id name slug';
const BRAND_CARD_SELECT = '_id name slug logo isActive sortOrder createdAt updatedAt';
const BUNDLE_ITEM_PRODUCT_SELECT = 'name slug images sku variants.color variants.storage variants.model variants.sku variants.stock';
/** In-process cache: slug/id string to resolved ObjectId. */
const categorySlugsCache = new Map();
const ADD_ON_KEYWORDS = [
    'accessory',
    'accessories',
    'adapter',
    'bag',
    'cable',
    'case',
    'charger',
    'cover',
    'dock',
    'earbud',
    'headset',
    'hub',
    'keyboard',
    'mouse',
    'power bank',
    'protector',
    'sleeve',
    'stand',
    'tempered'
];
const dedupeProductDetails = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        const key = item.id || item.slug;
        if (!key || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
const buildPublicAvailabilityFilter = (now = new Date()) => ({
    isActive: true,
    $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }]
});
const isPublishedNow = (product) => {
    if (!product.isActive) {
        return false;
    }
    if (!product.publishAt) {
        return true;
    }
    const publishAt = product.publishAt instanceof Date ? product.publishAt : new Date(product.publishAt);
    return Number.isNaN(publishAt.getTime()) ? true : publishAt.getTime() <= Date.now();
};
const buildBaseProductSort = (sort) => {
    if (sort === 'price_asc') {
        return { price: 1 };
    }
    if (sort === 'price_desc') {
        return { price: -1 };
    }
    if (sort === 'rating') {
        return { 'ratings.average': -1 };
    }
    if (sort === 'popular') {
        return { soldCount: -1 };
    }
    return { createdAt: -1 };
};
const buildProductSort = (sort, hasTextSearch = false) => {
    const baseSort = buildBaseProductSort(sort);
    if (!hasTextSearch) {
        return baseSort;
    }
    return {
        score: { $meta: 'textScore' },
        bundleStock: -1,
        'variants.stock': -1,
        ...baseSort
    };
};
const buildProductFilter = async (query, options = {}) => {
    const includePrice = options.includePrice ?? true;
    const now = new Date();
    const filterClauses = [buildPublicAvailabilityFilter(now)];
    if (query.q) {
        filterClauses.push({ $text: { $search: query.q } });
    }
    if (query.category?.length) {
        const categoryIds = await ensureCategoryIds(query.category);
        filterClauses.push({ category: categoryIds?.length ? { $in: categoryIds } : { $in: [] } });
    }
    if (query.brand?.length) {
        const brandIds = await brandService.resolveBrandFilterIds(query.brand);
        filterClauses.push({ brand: brandIds?.length ? { $in: brandIds } : { $in: [] } });
    }
    if (query.condition) {
        filterClauses.push({ condition: query.condition });
    }
    if (includePrice && (query.minPrice !== undefined || query.maxPrice !== undefined)) {
        filterClauses.push({
            price: {
                ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
                ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {})
            }
        });
    }
    if (query.rating !== undefined) {
        filterClauses.push({ 'ratings.average': { $gte: query.rating } });
    }
    if (query.featured !== undefined) {
        filterClauses.push({ isFeatured: query.featured });
    }
    if (query.bestSeller !== undefined) {
        filterClauses.push({ isBestSeller: query.bestSeller });
    }
    if (query.flashDeal !== undefined) {
        filterClauses.push({ isFlashDeal: query.flashDeal });
        if (query.flashDeal) {
            filterClauses.push({
                $or: [{ flashDealEndsAt: { $gt: now } }, { flashDealEndsAt: { $exists: false } }, { flashDealEndsAt: null }]
            });
        }
    }
    if (query.inStock || options.forceInStock) {
        filterClauses.push({
            $or: [{ 'variants.stock': { $gt: 0 } }, { bundleStock: { $gt: 0 } }]
        });
    }
    if (query.excludeIds?.length) {
        const excludedIds = query.excludeIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
        if (excludedIds.length) {
            filterClauses.push({ _id: { $nin: excludedIds } });
        }
    }
    return filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };
};
const normalizeObjectIdStrings = (values) => [...new Set((values ?? []).filter((value) => Boolean(value && Types.ObjectId.isValid(value))))];
const getVariantAwarePrice = (product, variantIndex) => {
    if (variantIndex === undefined) {
        return product.price;
    }
    return product.variants?.[variantIndex]?.price ?? product.price;
};
const ensureCategoryIds = async (categories) => {
    if (!categories?.length) {
        return undefined;
    }
    const now = Date.now();
    const resolvedIds = [];
    const slugsToFetch = [];
    for (const category of categories) {
        if (Types.ObjectId.isValid(category)) {
            resolvedIds.push(new Types.ObjectId(category));
            continue;
        }
        const cached = categorySlugsCache.get(category);
        if (cached && cached.expiresAt > now) {
            resolvedIds.push(cached.id);
        }
        else {
            slugsToFetch.push(category);
        }
    }
    if (slugsToFetch.length > 0) {
        const uniqueSlugs = [...new Set(slugsToFetch)];
        const matched = await Category.find({ slug: { $in: uniqueSlugs } })
            .select('_id slug')
            .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            .lean();
        const matchedBySlug = new Map(matched.map((c) => [c.slug, c._id]));
        const missingSlug = uniqueSlugs.find((slug) => !matchedBySlug.has(slug));
        if (missingSlug) {
            throw new AppError('Category not found', 404);
        }
        for (const slug of slugsToFetch) {
            const id = matchedBySlug.get(slug);
            categorySlugsCache.set(slug, { id, expiresAt: now + CATEGORY_SLUG_CACHE_TTL_MS });
            resolvedIds.push(id);
        }
    }
    return Array.from(new Map(resolvedIds.map((item) => [item.toString(), item])).values());
};
const generateUniqueSlug = async (name, currentId) => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let index = 1;
    while (true) {
        const existing = await Product.findOne({
            slug,
            ...(currentId ? { _id: { $ne: currentId } } : {})
        })
            .select('_id')
            .lean();
        if (!existing) {
            return slug;
        }
        slug = `${baseSlug}-${Date.now()}-${index}`;
        index += 1;
    }
};
const normalizeVariants = (variants) => variants.map((variant) => ({
    ...variant,
    color: variant.color?.trim(),
    colorCode: variant.colorCode?.trim(),
    storage: variant.storage?.trim(),
    model: variant.model?.trim(),
    attributes: variant.attributes
        ?.map((attribute) => ({
        name: attribute.name.trim(),
        value: attribute.value.trim()
    }))
        .filter((attribute) => attribute.name && attribute.value) ?? [],
    glowColor: variant.glowColor?.trim(),
    images: variant.images?.map((image) => ({
        url: image.url,
        publicId: image.publicId,
        alt: image.alt?.trim() || undefined
    })) ?? [],
    sku: variant.sku.trim().toUpperCase()
}));
const getProductStockSnapshot = (product) => ({
    _id: product._id,
    name: product.name,
    slug: product.slug,
    productType: product.productType,
    bundleStock: product.bundleStock,
    variants: product.variants.map((variant) => ({
        color: variant.color ?? undefined,
        storage: variant.storage ?? undefined,
        model: variant.model ?? undefined,
        stock: variant.stock,
        sku: variant.sku
    }))
});
const categoryCardPopulate = { path: 'category', select: CATEGORY_CARD_SELECT };
const categoryTextPopulate = { path: 'category', select: CATEGORY_TEXT_SELECT };
const brandCardPopulate = { path: 'brand', select: BRAND_CARD_SELECT };
const bundleItemProductPopulate = {
    path: 'bundleItems.product',
    select: BUNDLE_ITEM_PRODUCT_SELECT
};
const normalizeBrandLookupKey = (value) => slugify(value ?? '').toLowerCase();
const needsBrandLogoFallback = (brand) => {
    if (!brand || typeof brand === 'string' || brand instanceof Types.ObjectId) {
        return true;
    }
    if (typeof brand !== 'object') {
        return true;
    }
    return !('logo' in brand) || !brand.logo?.url;
};
const getBrandLookupDocuments = async () => cacheService.rememberVersioned(cacheNamespaces.brands, 'active-logo-lookup', BRAND_LOOKUP_CACHE_TTL_SECONDS, async () => Brand.find({ isActive: true })
    .select(BRAND_CARD_SELECT)
    .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
    .lean({ virtuals: true }));
const attachBrandLogoFallbacks = async (products) => {
    if (!products.some((product) => product.brandName && needsBrandLogoFallback(product.brand))) {
        return products;
    }
    const brands = await getBrandLookupDocuments();
    const brandsByKey = new Map();
    brands.forEach((brand) => {
        const nameKey = normalizeBrandLookupKey(brand.name);
        const slugKey = normalizeBrandLookupKey(brand.slug);
        if (nameKey) {
            brandsByKey.set(nameKey, brand);
        }
        if (slugKey) {
            brandsByKey.set(slugKey, brand);
        }
    });
    products.forEach((product) => {
        if (!product.brandName || !needsBrandLogoFallback(product.brand)) {
            return;
        }
        const matchedBrand = brandsByKey.get(normalizeBrandLookupKey(product.brandName));
        if (matchedBrand?.logo?.url) {
            product.brand = matchedBrand;
        }
    });
    return products;
};
const applyProductCardQueryShape = (query, imageLimit = PRODUCT_CARD_IMAGE_LIMIT) => query
    .select(PRODUCT_CARD_SELECT)
    .slice('images', imageLimit)
    .populate(categoryCardPopulate)
    .populate(brandCardPopulate);
const applyProductDetailQueryShape = (query) => query
    .select(PRODUCT_DETAIL_SELECT)
    .populate(categoryCardPopulate)
    .populate(brandCardPopulate)
    .populate(bundleItemProductPopulate);
const populateProductRelations = async (query) => applyProductDetailQueryShape(query);
const assertValidFlashDeal = (input) => {
    if (!input.isFlashDeal) {
        return;
    }
    if (input.comparePrice === undefined || input.comparePrice === null || input.comparePrice <= input.price) {
        throw new AppError('Flash deals require a compare price greater than the active price.', 400);
    }
};
const roundAdjustedPrice = (value) => Math.max(0, Math.round(value));
const applyAdjustment = (value, adjustmentType, amount) => adjustmentType === 'percentage' ? roundAdjustedPrice(value * (1 + amount / 100)) : roundAdjustedPrice(value + amount);
const buildBulkAdjustmentCommitMessage = (payload) => {
    const amountLabel = payload.adjustmentType === 'percentage'
        ? `${payload.amount >= 0 ? '+' : ''}${payload.amount}%`
        : `${payload.amount >= 0 ? '+' : ''}${payload.amount}`;
    const targetLabel = payload.target === 'both' ? 'price and compare price' : payload.target === 'comparePrice' ? 'compare price' : 'price';
    return `Bulk adjusted ${targetLabel} by ${amountLabel}`;
};
const toSnapshotRestorePayload = (snapshot) => ({
    name: snapshot.name,
    description: snapshot.description,
    shortDescription: snapshot.shortDescription,
    price: snapshot.price,
    comparePrice: snapshot.comparePrice,
    category: snapshot.category ?? '',
    brand: snapshot.brand ?? null,
    images: snapshot.images,
    condition: snapshot.condition,
    variants: snapshot.variants,
    specifications: snapshot.specifications,
    productType: snapshot.productType,
    bundleItems: snapshot.bundleItems?.filter((item) => Boolean(item.product)).map((item) => ({
        product: item.product,
        quantity: item.quantity,
        variantIndex: item.variantIndex
    })),
    isBestSeller: snapshot.isBestSeller,
    isFeatured: snapshot.isFeatured,
    isFlashDeal: snapshot.isFlashDeal,
    flashDealEndsAt: snapshot.flashDealEndsAt,
    isActive: snapshot.isActive,
    publishAt: snapshot.publishAt,
    tags: snapshot.tags,
    loyaltyPoints: snapshot.loyaltyPoints,
    sku: snapshot.sku,
    weight: snapshot.weight,
    metaTitle: snapshot.metaTitle,
    metaDescription: snapshot.metaDescription,
    canonicalUrl: snapshot.canonicalUrl,
    warranty: snapshot.warranty,
    videoUrl: snapshot.videoUrl
});
const recordProductVersion = async (product, options) => {
    if (options?.skipVersionRecord) {
        return;
    }
    await productVersionService.recordVersion({
        productId: product._id.toString(),
        snapshot: buildProductVersionSnapshot(product),
        updatedBy: options?.actorUserId,
        commitMessage: options?.commitMessage
    });
};
export const productService = {
    getHomeBanner: async () => bannerService.getPublicHomeHeroBanner(),
    getHomeFeatured: async () => {
        const featured = await productService.listProducts({ featured: true, limit: 8 });
        return featured.items;
    },
    getHomeLatest: async () => {
        const latest = await productService.listProducts({ sort: '-createdAt', limit: 4 });
        return latest.items;
    },
    getHomeFlashDeals: async () => {
        const flashDeals = await productService.listProducts({ flashDeal: true, sort: 'popular', limit: 4 });
        return flashDeals.items;
    },
    getHomeWantedProducts: async () => customerBehaviorService.getWantedProductCards(4),
    getHomeBrands: async () => {
        const brands = await brandService.listBrands({ activeOnly: true, sortBy: 'sortOrder', includeProductCounts: true });
        return brands.slice(0, 24);
    },
    getHomeRecentlyViewed: async (userId) => userId ? productService.getRecentlyViewed(userId) : Promise.resolve([]),
    getHomePublicFeed: async () => {
        return cacheService.remember(cacheKeys.homePublicFeed(), HOME_PUBLIC_FEED_CACHE_TTL_SECONDS, async () => {
            const [featured, banner, latest, flashDeals, wantedProducts, brands] = await Promise.all([
                productService.getHomeFeatured(),
                productService.getHomeBanner(),
                productService.getHomeLatest(),
                productService.getHomeFlashDeals(),
                productService.getHomeWantedProducts(),
                productService.getHomeBrands()
            ]);
            return {
                featured,
                banner,
                latest,
                flashDeals,
                wantedProducts,
                brands
            };
        });
    },
    getHomeFeed: async (userId) => {
        const [publicFeed, recentlyViewed] = await Promise.all([
            productService.getHomePublicFeed(),
            productService.getHomeRecentlyViewed(userId)
        ]);
        return {
            ...publicFeed,
            wantedProducts: publicFeed.wantedProducts ?? [],
            recentlyViewed
        };
    },
    listProducts: async (query) => {
        const page = Math.max(1, query.page ?? 1);
        // Hard cap at 100 items per page to prevent runaway queries.
        const limit = Math.min(100, Math.max(1, query.limit ?? 12));
        const filter = await buildProductFilter(query);
        const hasTextSearch = Boolean(query.q?.trim());
        return cacheService.rememberVersioned(cacheNamespaces.products, `list:${buildStableCacheSuffix(query)}`, PRODUCT_LIST_CACHE_TTL_SECONDS, async () => {
            const baseQuery = applyProductCardQueryShape(Product.find(filter, hasTextSearch ? { score: { $meta: 'textScore' } } : undefined), PRODUCT_LIST_IMAGE_LIMIT)
                .sort(buildProductSort(query.sort, hasTextSearch))
                .skip((page - 1) * limit)
                .limit(limit)
                .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
                .lean({ virtuals: true });
            // Direct Mongo to use the text index when a full-text search is active
            // so the query planner does not fall back to a collection scan.
            if (hasTextSearch) {
                baseQuery.hint({ $text: 1 });
            }
            const [items, total] = await Promise.all([
                baseQuery,
                Product.countDocuments(filter).maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            ]);
            const enrichedItems = await attachBrandLogoFallbacks(items);
            return {
                items: enrichedItems.map((item) => serializeProductCard(item, { previewImageLimit: 2 })),
                pagination: createPagination(page, limit, total)
            };
        });
    },
    getPriceRange: async (query = {}) => {
        const cacheSuffix = buildStableCacheSuffix({ ...query, minPrice: undefined, maxPrice: undefined, page: undefined, limit: undefined });
        return cacheService.rememberVersioned(cacheNamespaces.products, `price-range:${cacheSuffix}`, PRODUCT_LIST_CACHE_TTL_SECONDS, async () => {
            const filter = await buildProductFilter(query, { includePrice: false });
            const [range] = await Product.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        min: { $min: '$price' },
                        max: { $max: '$price' }
                    }
                }
            ]).option({ maxTimeMS: PUBLIC_PRODUCT_QUERY_TIMEOUT_MS });
            return {
                min: Math.max(0, Math.floor(range?.min ?? 0)),
                max: Math.max(0, Math.ceil(range?.max ?? 0))
            };
        });
    },
    getUpsells: async (payload) => {
        const limit = Math.min(12, Math.max(1, payload.limit ?? 3));
        const cartProductIds = normalizeObjectIdStrings(payload.items.map((item) => item.productId));
        if (!cartProductIds.length) {
            return [];
        }
        const getObjectIdString = (value) => {
            if (!value) {
                return undefined;
            }
            if (value instanceof Types.ObjectId) {
                return value.toString();
            }
            if (typeof value === 'string') {
                return Types.ObjectId.isValid(value) ? value : undefined;
            }
            if (typeof value === 'object' && '_id' in value) {
                return getObjectIdString(value._id);
            }
            return undefined;
        };
        const getCategoryText = (product) => {
            const category = product.category;
            if (!category || typeof category !== 'object' || category instanceof Types.ObjectId) {
                return '';
            }
            const { name, slug } = category;
            return [name, slug].filter(Boolean).join(' ');
        };
        const isAddOnProduct = (product) => {
            const searchableText = [
                product.name,
                product.shortDescription,
                getCategoryText(product),
                ...(product.tags ?? [])
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return ADD_ON_KEYWORDS.some((keyword) => searchableText.includes(keyword));
        };
        const cartProducts = await Product.find({ _id: { $in: cartProductIds }, ...buildPublicAvailabilityFilter() })
            .select('_id name shortDescription category brand price variants tags')
            .populate(categoryTextPopulate)
            .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            .lean();
        const cartProductMap = new Map(cartProducts.map((product) => [product._id.toString(), product]));
        const categoryIds = normalizeObjectIdStrings(cartProducts.map((product) => getObjectIdString(product.category)));
        const brandIds = normalizeObjectIdStrings(cartProducts.map((product) => product.brand?.toString()));
        const weightedPrice = payload.items.reduce((summary, item) => {
            const product = cartProductMap.get(item.productId);
            if (!product) {
                return summary;
            }
            const quantity = Math.max(1, item.quantity ?? 1);
            return {
                subtotal: summary.subtotal + getVariantAwarePrice(product, item.variantIndex) * quantity,
                quantity: summary.quantity + quantity
            };
        }, { subtotal: 0, quantity: 0 });
        const averageCartUnitPrice = weightedPrice.quantity > 0 ? weightedPrice.subtotal / weightedPrice.quantity : 0;
        const addOnRegexes = ADD_ON_KEYWORDS.map((keyword) => buildSafeRegex(keyword));
        const addOnCategories = await Category.find({
            $or: addOnRegexes.flatMap((regex) => [{ name: regex }, { slug: regex }])
        })
            .select('_id')
            .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            .lean();
        const addOnCategoryObjectIds = addOnCategories.map((category) => category._id);
        const baseFilterClauses = [
            buildPublicAvailabilityFilter(),
            { _id: { $nin: cartProductIds.map((id) => new Types.ObjectId(id)) } },
            { $or: [{ 'variants.stock': { $gt: 0 } }, { bundleStock: { $gt: 0 } }] }
        ];
        const affinityClauses = [
            ...(categoryIds.length ? [{ category: { $in: categoryIds.map((id) => new Types.ObjectId(id)) } }] : []),
            ...(brandIds.length ? [{ brand: { $in: brandIds.map((id) => new Types.ObjectId(id)) } }] : [])
        ];
        const affinityFilter = affinityClauses.length > 0 ? { $and: [...baseFilterClauses, { $or: affinityClauses }] } : { $and: baseFilterClauses };
        const addOnProductClauses = [
            ...(addOnCategoryObjectIds.length ? [{ category: { $in: addOnCategoryObjectIds } }] : []),
            ...addOnRegexes.flatMap((regex) => [{ name: regex }, { shortDescription: regex }, { tags: { $in: [regex] } }])
        ];
        // Cap the add-on candidate pool to avoid scanning the full collection.
        const ADD_ON_POOL_LIMIT = 50;
        const addOnProducts = await applyProductCardQueryShape(Product.find({ $and: [...baseFilterClauses, { $or: addOnProductClauses }] }), PRODUCT_LIST_IMAGE_LIMIT)
            .sort({ isBestSeller: -1, soldCount: -1, createdAt: -1 })
            .limit(Math.min(Math.max(limit * 4, 12), ADD_ON_POOL_LIMIT))
            .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            .lean({ virtuals: true });
        const productMap = new Map(addOnProducts.map((product) => [product._id.toString(), product]));
        if (productMap.size < limit) {
            // Fallback pool is also capped at 50 to prevent unbounded scans.
            const fallbackLimit = Math.min(Math.max((limit - productMap.size) * 4, 12), ADD_ON_POOL_LIMIT);
            const fallbackProducts = await applyProductCardQueryShape(Product.find({
                $and: [
                    ...baseFilterClauses,
                    { _id: { $nin: Array.from(productMap.keys()).map((id) => new Types.ObjectId(id)) } },
                    ...(affinityClauses.length ? [{ $or: affinityClauses }] : [])
                ]
            }), PRODUCT_LIST_IMAGE_LIMIT)
                .sort({ isBestSeller: -1, soldCount: -1, createdAt: -1 })
                .limit(fallbackLimit)
                .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
                .lean({ virtuals: true });
            fallbackProducts.forEach((product) => {
                productMap.set(product._id.toString(), product);
            });
        }
        const upsellCandidates = await attachBrandLogoFallbacks(Array.from(productMap.values()));
        const scoredProducts = upsellCandidates.map((product) => {
            const productCategoryId = product.category && typeof product.category === 'object' && '_id' in product.category
                ? product.category._id?.toString()
                : undefined;
            const productBrandId = product.brand && typeof product.brand === 'object' && '_id' in product.brand
                ? product.brand._id?.toString()
                : undefined;
            const isAddOn = isAddOnProduct(product);
            const targetPrice = Math.max(averageCartUnitPrice * (isAddOn ? 0.12 : 0.35), isAddOn ? 1500 : 1000);
            const priceDistance = averageCartUnitPrice > 0 ? Math.abs(product.price - targetPrice) / averageCartUnitPrice : 0;
            return {
                product,
                score: (isAddOn ? 70 : 0) +
                    (productCategoryId && categoryIds.includes(productCategoryId) ? 18 : 0) +
                    (productBrandId && brandIds.includes(productBrandId) ? 10 : 0) +
                    (product.isBestSeller ? 10 : 0) +
                    (product.isFeatured ? 5 : 0) +
                    Math.max(0, 24 - priceDistance * 24) +
                    (product.ratings?.average ?? 0)
            };
        });
        return scoredProducts
            .sort((left, right) => right.score - left.score)
            .slice(0, limit)
            .map(({ product }) => serializeProductCard(product));
    },
    getProductBySlug: async (slug) => cacheService.rememberVersioned(cacheNamespaces.products, `detail:${slug}`, PRODUCT_DETAIL_CACHE_TTL_SECONDS, async () => {
        const product = await applyProductDetailQueryShape(Product.findOne({
            slug,
            ...buildPublicAvailabilityFilter()
        }))
            .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            .lean({ virtuals: true });
        if (!product) {
            throw new AppError('Product not found', 404);
        }
        const [enrichedProduct] = await attachBrandLogoFallbacks([product]);
        return serializeProductDetail(enrichedProduct ?? product);
    }),
    getSuggestions: async (q) => {
        const trimmed = q.trim();
        if (!trimmed) {
            return [];
        }
        return cacheService.rememberVersioned(cacheNamespaces.products, `suggestions:${trimmed.toLowerCase()}`, PRODUCT_SUGGESTION_CACHE_TTL_SECONDS, async () => {
            const products = await Product.find({
                $and: [
                    buildPublicAvailabilityFilter(),
                    {
                        $or: [
                            { name: buildSafeRegex(trimmed) },
                            { brandName: buildSafeRegex(trimmed) },
                            { tags: { $in: [buildSafeRegex(trimmed)] } }
                        ]
                    }
                ]
            })
                .select(PRODUCT_SUGGESTION_SELECT)
                .slice('images', 1)
                .sort({ soldCount: -1, createdAt: -1 })
                .limit(8)
                .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
                .lean();
            return products.map((product) => serializeSuggestion(product));
        });
    },
    toggleWishlist: async (userId, productId) => {
        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            throw new AppError('Wishlist not found', 404);
        }
        const existingIndex = wishlist.items.findIndex((item) => item.toString() === productId);
        let added = false;
        if (existingIndex >= 0) {
            wishlist.items.splice(existingIndex, 1);
        }
        else {
            const product = await Product.findOne({ _id: productId, ...buildPublicAvailabilityFilter() })
                .select('_id')
                .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
                .lean();
            if (!product) {
                throw new AppError('Product not found', 404);
            }
            wishlist.items.push(new Types.ObjectId(productId));
            added = true;
        }
        await wishlist.save();
        await User.findByIdAndUpdate(userId, { wishlist: wishlist.items });
        return { added };
    },
    getWishlistProducts: async (userId) => {
        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist || wishlist.items.length === 0) {
            return [];
        }
        const products = await applyProductDetailQueryShape(Product.find({
            _id: { $in: wishlist.items },
            ...buildPublicAvailabilityFilter()
        }))
            .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            .lean({ virtuals: true });
        const productMap = new Map(products.map((product) => [product._id.toString(), product]));
        const activeIds = new Set(products.map((product) => product._id.toString()));
        const filteredItems = wishlist.items.filter((item) => activeIds.has(item.toString()));
        if (filteredItems.length !== wishlist.items.length) {
            wishlist.items = filteredItems;
            await wishlist.save();
            await User.findByIdAndUpdate(userId, { wishlist: filteredItems });
        }
        return filteredItems
            .map((item) => productMap.get(item.toString()))
            .filter((product) => Boolean(product))
            .map((product) => serializeProductDetail(product));
    },
    getCompareProducts: async (ids) => {
        const products = await Product.find({ _id: { $in: ids }, ...buildPublicAvailabilityFilter() })
            .select(PRODUCT_COMPARISON_SELECT)
            .slice('images', 1)
            .populate(brandCardPopulate)
            .limit(4)
            .maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS)
            .lean();
        const enrichedProducts = await attachBrandLogoFallbacks(products);
        return enrichedProducts.map((product) => serializeComparison(product));
    },
    saveCompareList: async (userId, sessionId, productIds) => {
        await CompareList.findOneAndUpdate(userId ? { user: userId } : { sessionId }, {
            ...(userId ? { user: userId } : { sessionId }),
            items: productIds.slice(0, 4)
        }, { upsert: true, new: true });
    },
    trackRecentlyViewed: async (userId, productId) => {
        await User.findByIdAndUpdate(userId, {
            $pull: { recentlyViewed: productId }
        });
        await User.findByIdAndUpdate(userId, {
            $push: {
                recentlyViewed: {
                    $each: [productId],
                    $position: 0,
                    $slice: 10
                }
            }
        });
    },
    getRecentlyViewed: async (userId) => {
        const user = await User.findById(userId).populate({
            path: 'recentlyViewed',
            match: buildPublicAvailabilityFilter(),
            select: PRODUCT_DETAIL_SELECT,
            populate: [categoryCardPopulate, brandCardPopulate, bundleItemProductPopulate]
        }).maxTimeMS(PUBLIC_PRODUCT_QUERY_TIMEOUT_MS).lean();
        if (!user) {
            throw new AppError('User not found', 404);
        }
        const recentlyViewed = Array.isArray(user.recentlyViewed) ? user.recentlyViewed : [];
        const publishedProducts = recentlyViewed.filter(isPublishedNow);
        const enrichedProducts = await attachBrandLogoFallbacks(publishedProducts);
        return dedupeProductDetails(enrichedProducts.map((product) => serializeProductDetail(product)));
    },
    createProduct: async (payload, options) => {
        assertValidFlashDeal(payload);
        const slug = await generateUniqueSlug(payload.name);
        const resolvedBrand = await brandService.resolveBrandReference(payload.brand);
        const productType = payload.productType ?? 'standard';
        const normalizedBundleItems = productType === 'bundle' ? await bundleService.normalizeBundleItems(payload.bundleItems) : [];
        const normalizedVariants = productType === 'bundle' ? [] : normalizeVariants(payload.variants);
        if (productType === 'standard' && normalizedVariants.length === 0) {
            throw new AppError('Standard products require at least one variant.', 400);
        }
        if (productType === 'bundle' && normalizedBundleItems.length === 0) {
            throw new AppError('Bundles require at least one bundled product.', 400);
        }
        const product = await Product.create({
            ...payload,
            slug,
            category: new Types.ObjectId(payload.category),
            brand: resolvedBrand.brand,
            brandName: resolvedBrand.brandName,
            condition: payload.condition ?? 'new',
            flashDealEndsAt: payload.flashDealEndsAt ? new Date(payload.flashDealEndsAt) : undefined,
            publishAt: payload.publishAt ? new Date(payload.publishAt) : undefined,
            productType,
            bundleItems: normalizedBundleItems,
            bundleStock: 0,
            variants: normalizedVariants,
            tags: payload.tags?.map((tag) => tag.trim()) ?? []
        });
        const bundleTransitions = await bundleService.recalculateBundleStocksForProductIds([product._id]);
        const populated = await populateProductRelations(Product.findById(product._id));
        if (!populated) {
            throw new AppError('Product not found', 404);
        }
        for (const transition of bundleTransitions) {
            await backInStockService.notifyOnStockTransition(transition.before, transition.after);
        }
        const versionSnapshot = {
            _id: populated._id,
            ...populated.toObject({ virtuals: true })
        };
        const serializedProduct = populated.toObject({ virtuals: true });
        await recordProductVersion(versionSnapshot, options);
        await invalidateInventoryDerivedCaches();
        await inventoryBroadcastService.broadcastProductStockUpdates([
            product._id,
            ...bundleTransitions.flatMap((transition) => [transition.before._id, transition.after._id])
        ]);
        return serializeProductDetail(serializedProduct);
    },
    updateProduct: async (productId, payload, options) => {
        const product = await Product.findById(productId);
        if (!product) {
            throw new AppError('Product not found', 404);
        }
        const previousStockSnapshot = getProductStockSnapshot(product);
        const nextPrice = payload.price ?? product.price;
        const nextComparePrice = payload.comparePrice !== undefined ? payload.comparePrice ?? undefined : product.comparePrice;
        const nextIsFlashDeal = payload.isFlashDeal ?? product.isFlashDeal;
        assertValidFlashDeal({
            price: nextPrice,
            comparePrice: nextComparePrice,
            isFlashDeal: nextIsFlashDeal
        });
        const nextSlug = payload.name ? await generateUniqueSlug(payload.name, productId) : product.slug;
        const nextProductType = payload.productType ?? product.productType ?? 'standard';
        const currentBundleItems = product.bundleItems.map((item) => ({
            product: item.product.toString(),
            quantity: item.quantity,
            variantIndex: item.variantIndex
        }));
        const currentVariants = product.variants.map((variant) => ({
            color: variant.color ?? undefined,
            colorCode: variant.colorCode ?? undefined,
            storage: variant.storage ?? undefined,
            model: variant.model ?? undefined,
            attributes: variant.attributes?.map((attribute) => ({ name: attribute.name, value: attribute.value })) ?? [],
            glowColor: variant.glowColor ?? undefined,
            images: variant.images?.map((image) => ({
                url: image.url,
                publicId: image.publicId,
                alt: image.alt ?? undefined
            })) ?? [],
            price: variant.price ?? undefined,
            stock: variant.stock,
            sku: variant.sku
        }));
        const nextBundleItems = nextProductType === 'bundle'
            ? await bundleService.normalizeBundleItems(payload.bundleItems ?? currentBundleItems, productId)
            : currentBundleItems;
        const nextVariants = nextProductType === 'bundle'
            ? normalizeVariants(currentVariants)
            : normalizeVariants(payload.variants ?? currentVariants);
        if (nextProductType === 'standard' && nextVariants.length === 0) {
            throw new AppError('Standard products require at least one variant.', 400);
        }
        if (nextProductType === 'bundle' && nextBundleItems.length === 0) {
            throw new AppError('Bundles require at least one bundled product.', 400);
        }
        const normalizedPayload = {
            ...payload,
            ...(payload.category ? { category: new Types.ObjectId(payload.category) } : {}),
            ...(payload.brand !== undefined ? await brandService.resolveBrandReference(payload.brand) : {}),
            ...(payload.tags ? { tags: payload.tags.map((tag) => tag.trim()) } : {}),
            ...(payload.comparePrice !== undefined ? { comparePrice: payload.comparePrice ?? null } : {}),
            ...(payload.flashDealEndsAt !== undefined
                ? { flashDealEndsAt: payload.flashDealEndsAt ? new Date(payload.flashDealEndsAt) : null }
                : payload.isFlashDeal === false
                    ? { flashDealEndsAt: null }
                    : {}),
            ...(payload.publishAt !== undefined ? { publishAt: payload.publishAt ? new Date(payload.publishAt) : null } : {}),
            ...(payload.weight !== undefined ? { weight: payload.weight ?? null } : {}),
            ...(payload.metaTitle !== undefined ? { metaTitle: payload.metaTitle?.trim() || null } : {}),
            ...(payload.metaDescription !== undefined ? { metaDescription: payload.metaDescription?.trim() || null } : {}),
            ...(payload.canonicalUrl !== undefined ? { canonicalUrl: payload.canonicalUrl?.trim() || null } : {}),
            ...(payload.warranty !== undefined ? { warranty: payload.warranty?.trim() || null } : {}),
            ...(payload.videoUrl !== undefined ? { videoUrl: payload.videoUrl?.trim() || null } : {}),
            productType: nextProductType,
            bundleItems: nextBundleItems,
            bundleStock: nextProductType === 'bundle' ? product.bundleStock ?? 0 : 0,
            variants: nextVariants
        };
        const updated = await Product.findByIdAndUpdate(productId, {
            ...normalizedPayload,
            slug: nextSlug
        }, { new: true });
        if (!updated) {
            throw new AppError('Product not found', 404);
        }
        const bundleTransitions = await bundleService.recalculateBundleStocksForProductIds([productId]);
        const refreshed = await populateProductRelations(Product.findById(productId));
        if (!refreshed) {
            throw new AppError('Product not found', 404);
        }
        await backInStockService.notifyOnStockTransition(previousStockSnapshot, getProductStockSnapshot(refreshed));
        for (const transition of bundleTransitions) {
            await backInStockService.notifyOnStockTransition(transition.before, transition.after);
        }
        const versionSnapshot = {
            _id: refreshed._id,
            ...refreshed.toObject({ virtuals: true })
        };
        const serializedProduct = refreshed.toObject({ virtuals: true });
        await recordProductVersion(versionSnapshot, options);
        await invalidateInventoryDerivedCaches();
        await inventoryBroadcastService.broadcastProductStockUpdates([
            refreshed._id,
            ...bundleTransitions.flatMap((transition) => [transition.before._id, transition.after._id])
        ]);
        return serializeProductDetail(serializedProduct);
    },
    bulkAdjustProductPrices: async (payload, options) => {
        const productIds = [...new Set(payload.productIds)].filter((productId) => Types.ObjectId.isValid(productId));
        if (!productIds.length) {
            throw new AppError('Select at least one product to adjust.', 400);
        }
        const products = await Product.find({ _id: { $in: productIds } }).maxTimeMS(5_000);
        if (!products.length) {
            throw new AppError('No matching products were found.', 404);
        }
        let flashDealsDisabledCount = 0;
        const updatedProductIds = [];
        for (const product of products) {
            const nextPrice = payload.target === 'comparePrice' ? product.price : applyAdjustment(product.price, payload.adjustmentType, payload.amount);
            const nextComparePrice = payload.target === 'price'
                ? product.comparePrice
                : product.comparePrice === undefined || product.comparePrice === null
                    ? product.comparePrice
                    : applyAdjustment(product.comparePrice, payload.adjustmentType, payload.amount);
            const shouldDisableFlashDeal = Boolean(product.isFlashDeal) &&
                (nextComparePrice === undefined || nextComparePrice === null || nextComparePrice <= nextPrice);
            product.price = nextPrice;
            product.comparePrice = nextComparePrice ?? undefined;
            if (payload.applyToVariantOverrides ?? true) {
                product.variants.forEach((variant) => {
                    if (variant.price === undefined || variant.price === null) {
                        return;
                    }
                    variant.price = applyAdjustment(variant.price, payload.adjustmentType, payload.amount);
                });
            }
            if (shouldDisableFlashDeal) {
                product.isFlashDeal = false;
                product.flashDealEndsAt = undefined;
                flashDealsDisabledCount += 1;
            }
            await product.save();
            updatedProductIds.push(product._id.toString());
            await recordProductVersion(product.toObject({ virtuals: true }), {
                ...options,
                commitMessage: options?.commitMessage ?? buildBulkAdjustmentCommitMessage(payload)
            });
        }
        await invalidateInventoryDerivedCaches();
        return {
            updatedCount: updatedProductIds.length,
            flashDealsDisabledCount,
            updatedProductIds
        };
    },
    listProductVersions: async (productId, limit = 5) => {
        const product = await Product.findById(productId)
            .select('_id')
            .lean();
        if (!product) {
            throw new AppError('Product not found', 404);
        }
        return productVersionService.listVersions(productId, limit);
    },
    restoreProductVersion: async (productId, versionId, options) => {
        const version = await productVersionService.getVersionById(productId, versionId);
        if (!version) {
            throw new AppError('Product version not found', 404);
        }
        return productService.updateProduct(productId, toSnapshotRestorePayload(version.snapshot), {
            ...options,
            commitMessage: options?.commitMessage ?? `Restored product to version ${version.version}`
        });
    },
    softDeleteProduct: async (productId, options) => {
        const product = await Product.findByIdAndUpdate(productId, { isActive: false }, { new: true });
        if (product) {
            await recordProductVersion(product.toObject({ virtuals: true }), {
                ...options,
                commitMessage: options?.commitMessage ?? 'Deactivated product'
            });
            await bundleService.recalculateBundleStocksForProductIds([productId]);
        }
        await invalidateInventoryDerivedCaches();
    },
    hardDeleteProduct: async (productId) => {
        const product = await Product.findById(productId)
            .select('_id')
            .lean();
        if (!product) {
            throw new AppError('Product not found', 404);
        }
        const [orderCount, reviewCount, bundleReferenceCount] = await Promise.all([
            Order.countDocuments({ 'items.product': product._id }),
            Review.countDocuments({ product: product._id }),
            Product.countDocuments({ productType: 'bundle', 'bundleItems.product': product._id })
        ]);
        if (orderCount > 0 || reviewCount > 0 || bundleReferenceCount > 0) {
            throw new AppError('This product is linked to existing orders or reviews. Deactivate it instead.', 400);
        }
        await Promise.all([
            Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
            Wishlist.updateMany({}, { $pull: { items: product._id } }),
            CompareList.updateMany({}, { $pull: { items: product._id } }),
            User.updateMany({}, { $pull: { wishlist: product._id, recentlyViewed: product._id } }),
            productVersionService.deleteVersionsForProduct(productId),
            Product.findByIdAndDelete(productId)
        ]);
        await invalidateInventoryDerivedCaches();
    }
};
