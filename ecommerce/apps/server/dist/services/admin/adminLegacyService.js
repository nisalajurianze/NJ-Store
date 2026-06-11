import dayjs from 'dayjs';
import mongoose, { Types } from 'mongoose';
import { parse } from 'csv-parse/sync';
import { slugify } from '@njstore/utils';
import { AuditLog } from '../../models/AuditLog.js';
import { Cart } from '../../models/Cart.js';
import { Category } from '../../models/Category.js';
import { CompareList } from '../../models/CompareList.js';
import { Coupon } from '../../models/Coupon.js';
import { LoyaltyTransaction } from '../../models/LoyaltyTransaction.js';
import { ManualExpense } from '../../models/ManualExpense.js';
import { NewsletterSubscriber } from '../../models/NewsletterSubscriber.js';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { RefreshSession } from '../../models/RefreshSession.js';
import { Review } from '../../models/Review.js';
import { ALL_PERMISSIONS, STAFF_DEFAULT_PERMISSIONS, User } from '../../models/User.js';
import { Wishlist } from '../../models/Wishlist.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { createPagination } from '../../utils/pagination.js';
import { serializeCategory, serializeUser } from '../../utils/serializers.js';
import { cacheKeys, cacheNamespaces, cacheService } from '../cacheService.js';
import { brandService } from '../brandService.js';
import { emailService } from '../emailService.js';
import { generateAnalyticsPdfBuffer, generateSalesAnalysisPdfBuffer } from '../pdfService.js';
import { siteConfigService } from '../siteConfigService.js';
import { buildProductVersionSnapshot, productVersionService } from '../productVersionService.js';
import { removeAsset, uploadBuffer } from '../uploadService.js';
const monthKey = (date) => dayjs(date).format('MMM YY');
const ANALYTICS_CACHE_TTL_SECONDS = 30;
const ANALYTICS_PRESET_DAYS = {
    '7d': 7,
    '30d': 30,
    '90d': 90
};
const SELF_MANAGED_ADMIN_PERMISSIONS = ['user:read', 'user:write'];
const DEFAULT_EXPENSE_CATEGORY = 'Operations';
const DEFAULT_IMPORTED_DESCRIPTION = 'Imported from CSV. Review and enrich this listing before publishing it live.';
const EMAIL_BATCH_SIZE = 25;
const SALES_RETENTION_WINDOW_MONTHS = 6;
const SALES_RFM_SEGMENT_LABELS = {
    champions: 'Champions',
    atRisk: 'At Risk',
    new: 'New',
    dormant: 'Dormant'
};
const SALES_RFM_SEGMENT_ORDER = ['champions', 'atRisk', 'new', 'dormant'];
const getDefaultPermissionsForRole = (role) => {
    if (role === 'customer') {
        return [];
    }
    if (role === 'staff') {
        return [...STAFF_DEFAULT_PERMISSIONS];
    }
    return [...ALL_PERMISSIONS];
};
const broadcastAudienceLabels = {
    customers: 'Verified Customers',
    unverifiedCustomers: 'Unverified Customers',
    newsletter: 'Confirmed Newsletter Subscribers',
    all: 'All Reachable Contacts',
    specificUsers: 'Selected User Segment'
};
const normalizeCsvKey = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeCsvValue = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeEmailAddress = (value) => value.trim().toLowerCase();
const toOptionalNumber = (value) => {
    if (!value) {
        return undefined;
    }
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : undefined;
};
const toRequiredPositiveNumber = (value) => {
    const normalized = toOptionalNumber(value);
    return normalized !== undefined && normalized > 0 ? normalized : undefined;
};
const toNonNegativeNumber = (value, fallback = 0) => {
    const normalized = toOptionalNumber(value);
    return normalized !== undefined && normalized >= 0 ? normalized : fallback;
};
const toBoolean = (value, fallback = false) => {
    if (!value) {
        return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'active', 'featured'].includes(normalized)) {
        return true;
    }
    if (['false', 'no', 'n', '0', 'inactive'].includes(normalized)) {
        return false;
    }
    return fallback;
};
const normalizeOptionalCouponNumber = (value) => (typeof value === 'number' ? value : undefined);
const normalizeOptionalCouponEmail = (value) => typeof value === 'string' && value.trim() ? normalizeEmailAddress(value) : undefined;
const normalizeCouponObjectIds = (values) => values?.length ? values.map((value) => new Types.ObjectId(value)) : undefined;
const normalizeCouponPayload = (payload) => ({
    ...payload,
    ...(payload.code ? { code: payload.code.trim().toUpperCase() } : {}),
    minOrderValue: normalizeOptionalCouponNumber(payload.minOrderValue),
    maxDiscount: normalizeOptionalCouponNumber(payload.maxDiscount),
    restrictToEmail: normalizeOptionalCouponEmail(payload.restrictToEmail),
    appliesToCategories: normalizeCouponObjectIds(payload.appliesToCategories),
    appliesToBrands: normalizeCouponObjectIds(payload.appliesToBrands)
});
const normalizeComparableText = (value) => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
const mergeUniqueObjectIds = (left = [], right = []) => {
    const mergedItems = [];
    const seenIds = new Set();
    for (const item of [...left, ...right]) {
        const itemId = item.toString();
        if (seenIds.has(itemId)) {
            continue;
        }
        seenIds.add(itemId);
        mergedItems.push(item);
    }
    return mergedItems;
};
const mergeUniqueText = (left, right) => {
    const values = [left, right].map((value) => value?.trim()).filter((value) => Boolean(value));
    return values.length ? [...new Set(values)].join(' / ') : undefined;
};
const buildAddressFingerprint = (address) => [
    address.label,
    address.fullName,
    address.phone,
    address.line1,
    address.line2,
    address.city,
    address.district,
    address.postalCode,
    address.country
]
    .map((value) => normalizeComparableText(value))
    .join('|');
const mergeAddresses = (left = [], right = []) => {
    const mergedAddresses = [];
    const seenFingerprints = new Set();
    for (const address of [...left, ...right]) {
        const fingerprint = buildAddressFingerprint(address);
        if (seenFingerprints.has(fingerprint)) {
            continue;
        }
        seenFingerprints.add(fingerprint);
        mergedAddresses.push(address);
    }
    const limitedAddresses = mergedAddresses.slice(0, 5);
    const hasDefault = limitedAddresses.some((address) => address.isDefault);
    if (!hasDefault && limitedAddresses[0]) {
        limitedAddresses[0].isDefault = true;
    }
    return limitedAddresses;
};
const mergeCartItems = (left = [], right = []) => {
    const merged = new Map();
    for (const item of [...left, ...right]) {
        const key = `${item.product.toString()}:${item.variantIndex ?? 'base'}`;
        const existing = merged.get(key);
        if (existing) {
            existing.quantity += item.quantity;
            continue;
        }
        merged.set(key, {
            product: item.product,
            variantIndex: item.variantIndex,
            quantity: item.quantity
        });
    }
    return [...merged.values()];
};
const syncReviewRatingsForProducts = async (productIds) => {
    const uniqueProductIds = [...new Set(productIds.map((productId) => productId.toString()))].map((productId) => new Types.ObjectId(productId));
    await Promise.all(uniqueProductIds.map(async (productId) => {
        const stats = await Review.aggregate([
            { $match: { product: productId, isApproved: true } },
            {
                $group: {
                    _id: '$product',
                    average: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);
        const rating = stats[0] ?? { average: 0, count: 0 };
        await Product.findByIdAndUpdate(productId, {
            ratings: {
                average: Number(rating.average.toFixed(1)),
                count: rating.count
            }
        });
    }));
};
const readCsvField = (record, aliases) => {
    for (const alias of aliases) {
        const value = record[normalizeCsvKey(alias)];
        if (value) {
            return value;
        }
    }
    return '';
};
const createRankScores = (values, direction) => {
    if (values.length === 0) {
        return [];
    }
    const rankedEntries = values
        .map((value, index) => ({ value, index }))
        .sort((left, right) => (direction === 'desc' ? right.value - left.value : left.value - right.value));
    const scores = Array(values.length).fill(3);
    rankedEntries.forEach((entry, position) => {
        const bucket = Math.min(4, Math.floor((position * 5) / rankedEntries.length));
        scores[entry.index] = 5 - bucket;
    });
    return scores;
};
const assignSalesRfmSegment = (input) => {
    if (input.recencyScore >= 4 && input.orderCount >= 2 && (input.frequencyScore >= 3 || input.monetaryScore >= 3)) {
        return 'champions';
    }
    if (input.orderCount <= 2 && input.daysSinceLastOrder <= 45 && input.recencyScore >= 4) {
        return 'new';
    }
    if (input.daysSinceLastOrder > 120 || (input.recencyScore <= 2 && input.frequencyScore <= 2 && input.monetaryScore <= 2)) {
        return 'dormant';
    }
    if (input.recencyScore <= 2 || input.daysSinceLastOrder > 60) {
        return 'atRisk';
    }
    if (input.frequencyScore >= 4 || input.monetaryScore >= 4) {
        return 'champions';
    }
    return 'new';
};
const resolveCategoryIdForCsvImport = async (value) => {
    const normalized = value.trim();
    if (!normalized) {
        return undefined;
    }
    if (Types.ObjectId.isValid(normalized)) {
        const category = await Category.findById(normalized).select('_id');
        return category?._id.toString();
    }
    const category = await Category.findOne({
        $or: [{ slug: slugify(normalized) }, { name: new RegExp(`^${escapeRegExp(normalized)}$`, 'i') }]
    }).select('_id');
    return category?._id.toString();
};
const buildImportedShortDescription = (name, brand, provided) => {
    if (provided?.trim()) {
        return provided.trim();
    }
    return `${brand} ${name} imported via CSV for admin review.`.slice(0, 500);
};
const buildImportedDescription = (name, brand, provided) => {
    if (provided?.trim()) {
        return provided.trim();
    }
    return `${name} by ${brand}. ${DEFAULT_IMPORTED_DESCRIPTION}`;
};
const buildNormalizedCsvRecord = (record) => Object.fromEntries(Object.entries(record).map(([key, value]) => [normalizeCsvKey(key), normalizeCsvValue(value)]));
const formatAnalyticsRangeLabel = (start, end) => {
    if (start.isSame(end, 'day')) {
        return start.format('D MMM YYYY');
    }
    if (start.year() === end.year()) {
        return `${start.format('D MMM')} - ${end.format('D MMM YYYY')}`;
    }
    return `${start.format('D MMM YYYY')} - ${end.format('D MMM YYYY')}`;
};
const buildAnalyticsDayRange = (start, end) => {
    const dayCount = end.startOf('day').diff(start.startOf('day'), 'day') + 1;
    return Array.from({ length: Math.max(dayCount, 1) }, (_, index) => start.startOf('day').add(index, 'day'));
};
const buildAnalyticsWindow = (query = {}) => {
    const period = query.period ?? '30d';
    const now = dayjs();
    const currentEnd = period === 'custom' && query.endDate ? dayjs(query.endDate).endOf('day') : now.endOf('day');
    const currentStart = period === 'custom' && query.startDate
        ? dayjs(query.startDate).startOf('day')
        : currentEnd.subtract(ANALYTICS_PRESET_DAYS[period] - 1, 'day').startOf('day');
    const days = currentEnd.startOf('day').diff(currentStart.startOf('day'), 'day') + 1;
    const comparisonEnd = currentStart.subtract(1, 'day').endOf('day');
    const comparisonStart = currentStart.subtract(days, 'day').startOf('day');
    return {
        period,
        currentStart,
        currentEnd,
        comparisonStart,
        comparisonEnd,
        days,
        label: formatAnalyticsRangeLabel(currentStart, currentEnd),
        comparisonLabel: formatAnalyticsRangeLabel(comparisonStart, comparisonEnd)
    };
};
const calculateAnalyticsDelta = (current, previous) => previous === 0 ? (current > 0 ? 100 : 0) : Number((((current - previous) / previous) * 100).toFixed(1));
const resolveBroadcastCtaUrl = (value, baseUrl) => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `${baseUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};
const dedupeEmails = (emails) => [...new Set(emails.map(normalizeEmailAddress).filter(Boolean))];
const fetchCustomerBroadcastEmails = async () => {
    const customers = await User.find({
        role: 'customer',
        isActive: true,
        isEmailVerified: true
    })
        .select('email')
        .lean();
    return dedupeEmails(customers.map((customer) => customer.email));
};
const fetchUnverifiedCustomerBroadcastEmails = async () => {
    const customers = await User.find({
        role: 'customer',
        isActive: true,
        isEmailVerified: false
    })
        .select('email')
        .lean();
    return dedupeEmails(customers.map((customer) => customer.email));
};
const fetchNewsletterBroadcastEmails = async () => {
    const subscribers = await NewsletterSubscriber.find({ isConfirmed: true }).select('email').lean();
    return dedupeEmails(subscribers.map((subscriber) => subscriber.email));
};
const fetchSpecificUserBroadcastEmails = async (recipientUserIds = []) => {
    const validUserIds = [...new Set(recipientUserIds.filter((userId) => Types.ObjectId.isValid(userId)))];
    if (validUserIds.length === 0) {
        return [];
    }
    const recipients = await User.find({
        _id: { $in: validUserIds.map((userId) => new Types.ObjectId(userId)) },
        isActive: true
    })
        .select('email')
        .lean();
    return dedupeEmails(recipients.map((recipient) => recipient.email));
};
const getBroadcastRecipientEmails = async (audience, recipientUserIds = []) => {
    if (audience === 'specificUsers') {
        return fetchSpecificUserBroadcastEmails(recipientUserIds);
    }
    if (audience === 'customers') {
        return fetchCustomerBroadcastEmails();
    }
    if (audience === 'unverifiedCustomers') {
        return fetchUnverifiedCustomerBroadcastEmails();
    }
    if (audience === 'newsletter') {
        return fetchNewsletterBroadcastEmails();
    }
    const [customers, unverifiedCustomers, subscribers] = await Promise.all([
        fetchCustomerBroadcastEmails(),
        fetchUnverifiedCustomerBroadcastEmails(),
        fetchNewsletterBroadcastEmails()
    ]);
    return dedupeEmails([...customers, ...unverifiedCustomers, ...subscribers]);
};
const generateUniqueProductSlugFromCsv = async (name, currentId) => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let attempt = 1;
    while (true) {
        const existing = await Product.findOne({
            slug,
            ...(currentId ? { _id: { $ne: currentId } } : {})
        }).select('_id');
        if (!existing) {
            return slug;
        }
        slug = `${baseSlug}-${attempt}`;
        attempt += 1;
    }
};
const invalidateCategoryCaches = async () => {
    await Promise.all([
        cacheService.bumpNamespace(cacheNamespaces.categories),
        cacheService.bumpNamespace(cacheNamespaces.products)
    ]);
};
const invalidateAnalyticsCaches = async () => {
    await cacheService.bumpNamespace(cacheNamespaces.analytics);
};
const invalidateSalesAnalysisCaches = async () => {
    await Promise.all([
        cacheService.bumpNamespace(cacheNamespaces.analytics),
        cacheService.bumpNamespace(cacheNamespaces.siteConfig)
    ]);
};
const invalidateCachedUser = async (userId) => {
    await cacheService.delete(cacheKeys.authUser(userId));
};
const invalidateCachedUserSessions = async (userId) => {
    const sessions = await RefreshSession.find({ user: userId, revokedAt: null })
        .select('sessionId')
        .lean();
    await Promise.all(sessions.map((session) => cacheService.delete(cacheKeys.authSession(session.sessionId))));
};
const generateUniqueCategorySlug = async (name, categoryId) => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let attempt = 1;
    while (true) {
        const existing = await Category.findOne({
            slug,
            ...(categoryId ? { _id: { $ne: categoryId } } : {})
        });
        if (!existing) {
            return slug;
        }
        slug = `${baseSlug}-${attempt}`;
        attempt += 1;
    }
};
const buildCategoryTree = (categories) => {
    const map = new Map();
    const roots = [];
    categories.forEach((category) => {
        map.set(category._id, {
            id: category._id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            metaTitle: category.metaTitle,
            metaDescription: category.metaDescription,
            image: category.image,
            parent: category.parent ?? null,
            isActive: category.isActive,
            order: category.order,
            productCount: category.productCount,
            children: []
        });
    });
    map.forEach((category) => {
        if (category.parent && map.has(category.parent)) {
            map.get(category.parent)?.children?.push(category);
        }
        else {
            roots.push(category);
        }
    });
    return roots.sort((a, b) => a.order - b.order);
};
const getLegacyManualExpenses = (config) => (config.get('manualExpenses') ?? []);
const normalizeManualExpense = (expense) => ({
    _id: expense._id,
    label: expense.label.trim(),
    amount: expense.amount,
    incurredOn: expense.incurredOn,
    category: expense.category?.trim() || DEFAULT_EXPENSE_CATEGORY,
    notes: expense.notes?.trim() || undefined
});
const listManualExpensesWithFallback = async (config) => {
    const storedExpenses = await ManualExpense.find().sort({ incurredOn: -1, createdAt: -1 }).lean();
    if (storedExpenses.length) {
        return storedExpenses.map(normalizeManualExpense);
    }
    const legacyExpenses = getLegacyManualExpenses(config).map(normalizeManualExpense);
    if (!legacyExpenses.length) {
        return [];
    }
    await ManualExpense.insertMany(legacyExpenses.map((expense) => ({
        _id: expense._id,
        label: expense.label,
        amount: expense.amount,
        incurredOn: expense.incurredOn,
        category: expense.category,
        notes: expense.notes
    })), { ordered: false });
    config.set('manualExpenses', []);
    await config.save();
    return ManualExpense.find().sort({ incurredOn: -1, createdAt: -1 }).lean();
};
const clearLegacyManualExpenses = async () => {
    const config = await siteConfigService.getOrCreateDocument();
    if (getLegacyManualExpenses(config).length) {
        config.set('manualExpenses', []);
        await config.save();
    }
};
const serializeManualExpense = (expense) => ({
    id: expense._id.toString(),
    label: expense.label,
    amount: expense.amount,
    incurredOn: expense.incurredOn.toISOString(),
    category: expense.category?.trim() || DEFAULT_EXPENSE_CATEGORY,
    notes: expense.notes?.trim() || undefined
});
const buildSalesPoint = (input) => ({
    period: input.period,
    label: input.label,
    revenue: input.revenue,
    expenses: input.expenses,
    net: input.revenue - input.expenses,
    orderCount: input.orderCount
});
export const adminService = {
    importProductsCsv: async (fileBuffer, actorUserId) => {
        const records = parse(fileBuffer, { columns: true, skip_empty_lines: true });
        let success = 0;
        let failed = 0;
        for (const rawRecord of records) {
            try {
                const record = buildNormalizedCsvRecord(rawRecord);
                const name = readCsvField(record, ['name']);
                const brand = readCsvField(record, ['brand']);
                const sku = readCsvField(record, ['sku']);
                const price = toRequiredPositiveNumber(readCsvField(record, ['price']));
                const categoryValue = readCsvField(record, ['category', 'categoryname', 'categoryslug', 'categoryid']);
                const categoryId = await resolveCategoryIdForCsvImport(categoryValue);
                if (!name || !brand || !sku || price === undefined || !categoryId) {
                    failed++;
                    continue;
                }
                const comparePrice = toOptionalNumber(readCsvField(record, ['compareprice', 'saleprice']));
                const shortDescription = buildImportedShortDescription(name, brand, readCsvField(record, ['shortdescription']));
                const description = buildImportedDescription(name, brand, readCsvField(record, ['description']));
                const stock = toNonNegativeNumber(readCsvField(record, ['stock']), 0);
                const loyaltyPoints = toNonNegativeNumber(readCsvField(record, ['loyaltypoints']), 0);
                const weight = toOptionalNumber(readCsvField(record, ['weight']));
                const isActive = toBoolean(readCsvField(record, ['active', 'isactive']), false);
                const isFeatured = toBoolean(readCsvField(record, ['featuredstatus', 'featured', 'isfeatured']));
                const isBestSeller = toBoolean(readCsvField(record, ['bestseller', 'isbestseller']));
                const isFlashDeal = toBoolean(readCsvField(record, ['flashdeal', 'isflashdeal']));
                const flashDealEndsAtRaw = readCsvField(record, ['flashdealendsat', 'flashsaleendsat']);
                const flashDealEndsAt = flashDealEndsAtRaw ? new Date(flashDealEndsAtRaw) : undefined;
                const publishAtRaw = readCsvField(record, ['publishat', 'scheduledpublishat', 'scheduledfor']);
                const publishAt = publishAtRaw ? new Date(publishAtRaw) : undefined;
                const tags = readCsvField(record, ['tags'])
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean);
                const backgroundImageUrl = readCsvField(record, ['imageurl']);
                const backgroundImagePublicId = readCsvField(record, ['imagepublicid']);
                const backgroundImageAlt = readCsvField(record, ['imagealt']);
                const metaTitle = readCsvField(record, ['metatitle', 'seo title']);
                const metaDescription = readCsvField(record, ['metadescription', 'seo description']);
                const canonicalUrl = readCsvField(record, ['canonicalurl', 'canonical']);
                const basePayload = {
                    name,
                    description,
                    shortDescription,
                    price,
                    comparePrice,
                    category: categoryId,
                    images: backgroundImageUrl && backgroundImagePublicId
                        ? [{ url: backgroundImageUrl, publicId: backgroundImagePublicId, alt: backgroundImageAlt || undefined }]
                        : [],
                    specifications: [],
                    isBestSeller,
                    isFeatured,
                    isFlashDeal,
                    flashDealEndsAt: flashDealEndsAt && !Number.isNaN(flashDealEndsAt.getTime()) ? flashDealEndsAt : undefined,
                    isActive,
                    publishAt: publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt : undefined,
                    tags,
                    loyaltyPoints,
                    sku,
                    weight,
                    metaTitle: metaTitle || undefined,
                    metaDescription: metaDescription || undefined,
                    canonicalUrl: canonicalUrl || undefined
                };
                if (isFlashDeal && (comparePrice === undefined || comparePrice <= price)) {
                    failed++;
                    continue;
                }
                const resolvedBrand = await brandService.resolveOrCreateBrandByName(brand);
                const existing = await Product.findOne({ sku });
                if (existing) {
                    const nextVariants = existing.variants.length <= 1
                        ? [
                            {
                                color: existing.variants[0]?.color,
                                colorCode: existing.variants[0]?.colorCode,
                                storage: existing.variants[0]?.storage,
                                model: existing.variants[0]?.model,
                                price: existing.variants[0]?.price,
                                stock,
                                sku
                            }
                        ]
                        : undefined;
                    existing.set({
                        ...basePayload,
                        brand: resolvedBrand.brand,
                        brandName: resolvedBrand.brandName,
                        slug: await generateUniqueProductSlugFromCsv(name, existing._id.toString()),
                        ...(nextVariants ? { variants: nextVariants } : {})
                    });
                    await existing.save();
                    await productVersionService.recordVersion({
                        productId: existing._id.toString(),
                        snapshot: buildProductVersionSnapshot(existing.toObject({ virtuals: true })),
                        updatedBy: actorUserId,
                        commitMessage: 'Updated product via CSV import'
                    });
                }
                else {
                    const created = await Product.create({
                        ...basePayload,
                        brand: resolvedBrand.brand,
                        brandName: resolvedBrand.brandName,
                        slug: await generateUniqueProductSlugFromCsv(name),
                        variants: [
                            {
                                stock,
                                sku
                            }
                        ]
                    });
                    await productVersionService.recordVersion({
                        productId: created._id.toString(),
                        snapshot: buildProductVersionSnapshot(created.toObject({ virtuals: true })),
                        updatedBy: actorUserId,
                        commitMessage: 'Created product via CSV import'
                    });
                }
                success++;
            }
            catch (error) {
                logger.error('Failed to import CSV row', error);
                failed++;
            }
        }
        if (success > 0) {
            await Promise.all([
                cacheService.bumpNamespace(cacheNamespaces.products),
                cacheService.bumpNamespace(cacheNamespaces.brands)
            ]);
        }
        return { success, failed };
    },
    getAnalytics: async (query = {}) => {
        const analyticsWindow = buildAnalyticsWindow(query);
        const cacheKey = [
            'summary',
            analyticsWindow.period,
            analyticsWindow.currentStart.format('YYYY-MM-DD'),
            analyticsWindow.currentEnd.format('YYYY-MM-DD')
        ].join(':');
        return cacheService.rememberVersioned(cacheNamespaces.analytics, cacheKey, ANALYTICS_CACHE_TTL_SECONDS, async () => {
            const siteConfig = await siteConfigService.getOrCreateDocument();
            const currentDays = buildAnalyticsDayRange(analyticsWindow.currentStart, analyticsWindow.currentEnd);
            const last12Months = Array.from({ length: 12 }, (_, index) => analyticsWindow.currentEnd.subtract(11 - index, 'month').startOf('month'));
            const liveOrderFilter = {
                deletedAt: null,
                isQuotation: false
            };
            const paidOrderFilter = {
                ...liveOrderFilter,
                paymentStatus: 'paid'
            };
            const currentRange = {
                $gte: analyticsWindow.currentStart.toDate(),
                $lte: analyticsWindow.currentEnd.toDate()
            };
            const comparisonRange = {
                $gte: analyticsWindow.comparisonStart.toDate(),
                $lte: analyticsWindow.comparisonEnd.toDate()
            };
            const [currentOrderStats, comparisonOrderStats, revenueByDay, statusCounts, monthlyRevenue, currentTopProducts, comparisonTopProducts, geographicDistribution, cartActivityResult, quotationCountResult, confirmedOrdersResult, userAnalyticsResult, lowStockAlerts] = await Promise.all([
                Order.aggregate([
                    { $match: { ...paidOrderFilter, createdAt: currentRange } },
                    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { ...paidOrderFilter, createdAt: comparisonRange } },
                    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { ...paidOrderFilter, createdAt: currentRange } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            revenue: { $sum: '$total' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Order.aggregate([
                    { $match: liveOrderFilter },
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { ...paidOrderFilter, createdAt: { $gte: last12Months[0]?.toDate(), $lte: analyticsWindow.currentEnd.toDate() } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                            revenue: { $sum: '$total' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Order.aggregate([
                    { $match: { ...paidOrderFilter, createdAt: currentRange } },
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.product',
                            name: { $first: '$items.name' },
                            unitsSold: { $sum: '$items.quantity' },
                            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                        }
                    },
                    { $sort: { revenue: -1, unitsSold: -1 } },
                    { $limit: 5 }
                ]),
                Order.aggregate([
                    { $match: { ...paidOrderFilter, createdAt: comparisonRange } },
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.product',
                            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                        }
                    }
                ]),
                Order.aggregate([
                    { $match: { ...paidOrderFilter, createdAt: currentRange, 'shippingAddress.district': { $exists: true, $nin: ['', null] } } },
                    {
                        $group: {
                            _id: '$shippingAddress.district',
                            orderCount: { $sum: 1 },
                            revenue: { $sum: '$total' }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            district: '$_id',
                            orderCount: 1,
                            revenue: 1
                        }
                    },
                    { $sort: { revenue: -1, district: 1 } }
                ]),
                Cart.aggregate([
                    { $match: { updatedAt: currentRange, 'items.0': { $exists: true } } },
                    { $count: 'count' }
                ]),
                Order.aggregate([
                    { $match: { deletedAt: null, quotationNumber: { $exists: true, $ne: null }, createdAt: currentRange } },
                    { $count: 'count' }
                ]),
                Order.aggregate([
                    { $match: { deletedAt: null, quotationNumber: { $exists: true, $ne: null } } },
                    { $unwind: '$timeline' },
                    {
                        $match: {
                            'timeline.note': 'Quotation confirmed by customer',
                            'timeline.createdAt': currentRange
                        }
                    },
                    { $count: 'count' }
                ]),
                User.aggregate([
                    { $match: { role: 'customer' } },
                    {
                        $facet: {
                            currentRangeCustomers: [{ $match: { createdAt: currentRange } }, { $count: 'count' }],
                            comparisonRangeCustomers: [{ $match: { createdAt: comparisonRange } }, { $count: 'count' }],
                            baselineCustomers: [{ $match: { createdAt: { $lt: analyticsWindow.currentStart.toDate() } } }, { $count: 'count' }],
                            customerCountsByDay: [
                                { $match: { createdAt: currentRange } },
                                {
                                    $group: {
                                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                        count: { $sum: 1 }
                                    }
                                },
                                { $sort: { _id: 1 } }
                            ]
                        }
                    }
                ]),
                Product.aggregate([
                    { $match: { isActive: true } },
                    { $unwind: '$variants' },
                    { $match: { 'variants.stock': { $lt: siteConfig.lowStockThreshold } } },
                    {
                        $project: {
                            _id: 0,
                            productId: '$_id',
                            productName: '$name',
                            variantSku: '$variants.sku',
                            stock: '$variants.stock'
                        }
                    },
                    { $sort: { stock: 1, productName: 1 } }
                ])
            ]);
            const userAnalytics = userAnalyticsResult[0] ?? {
                currentRangeCustomers: [],
                comparisonRangeCustomers: [],
                baselineCustomers: [],
                customerCountsByDay: []
            };
            const revenueCurrent = currentOrderStats[0]?.revenue ?? 0;
            const revenuePrevious = comparisonOrderStats[0]?.revenue ?? 0;
            const ordersCurrent = currentOrderStats[0]?.orders ?? 0;
            const ordersPrevious = comparisonOrderStats[0]?.orders ?? 0;
            const averageOrderValueCurrent = ordersCurrent > 0 ? revenueCurrent / ordersCurrent : 0;
            const averageOrderValuePrevious = ordersPrevious > 0 ? revenuePrevious / ordersPrevious : 0;
            const customersCurrent = userAnalytics.currentRangeCustomers[0]?.count ?? 0;
            const customersPrevious = userAnalytics.comparisonRangeCustomers[0]?.count ?? 0;
            const revenueMap = new Map(revenueByDay.map((entry) => [entry._id, entry.revenue]));
            const revenue = currentDays.map((day) => ({
                date: day.format('YYYY-MM-DD'),
                revenue: revenueMap.get(day.format('YYYY-MM-DD')) ?? 0
            }));
            const statusCountMap = new Map(statusCounts.map((entry) => [entry._id, entry.count]));
            const statusBreakdown = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => ({
                status,
                count: statusCountMap.get(status) ?? 0
            }));
            const monthlyRevenueMap = new Map(monthlyRevenue.map((entry) => [entry._id, entry.revenue]));
            const monthlySales = last12Months.map((month) => ({
                month: monthKey(month.toDate()),
                revenue: monthlyRevenueMap.get(month.format('YYYY-MM')) ?? 0
            }));
            const comparisonTopProductMap = new Map(comparisonTopProducts.map((item) => [item._id.toString(), item.revenue]));
            const topProducts = currentTopProducts.map((item) => ({
                productId: item._id.toString(),
                name: item.name,
                unitsSold: item.unitsSold,
                revenue: item.revenue,
                trend: calculateAnalyticsDelta(item.revenue, comparisonTopProductMap.get(item._id.toString()) ?? 0)
            }));
            const baselineCustomers = userAnalytics.baselineCustomers[0]?.count ?? 0;
            const customerCountsMap = new Map(userAnalytics.customerCountsByDay.map((entry) => [entry._id, entry.count]));
            let cumulativeCustomers = baselineCustomers;
            const customerGrowth = currentDays.map((day) => {
                cumulativeCustomers += customerCountsMap.get(day.format('YYYY-MM-DD')) ?? 0;
                return {
                    date: day.format('YYYY-MM-DD'),
                    totalCustomers: cumulativeCustomers
                };
            });
            return {
                range: {
                    period: analyticsWindow.period,
                    startDate: analyticsWindow.currentStart.toISOString(),
                    endDate: analyticsWindow.currentEnd.toISOString(),
                    comparisonStartDate: analyticsWindow.comparisonStart.toISOString(),
                    comparisonEndDate: analyticsWindow.comparisonEnd.toISOString(),
                    label: analyticsWindow.label,
                    comparisonLabel: analyticsWindow.comparisonLabel,
                    days: analyticsWindow.days
                },
                kpis: [
                    { label: 'Total Revenue', value: revenueCurrent, delta: calculateAnalyticsDelta(revenueCurrent, revenuePrevious), currency: true },
                    { label: 'Total Orders', value: ordersCurrent, delta: calculateAnalyticsDelta(ordersCurrent, ordersPrevious) },
                    { label: 'New Customers', value: customersCurrent, delta: calculateAnalyticsDelta(customersCurrent, customersPrevious) },
                    {
                        label: 'Average Order Value',
                        value: averageOrderValueCurrent,
                        delta: calculateAnalyticsDelta(averageOrderValueCurrent, averageOrderValuePrevious),
                        currency: true
                    }
                ],
                revenue,
                statusBreakdown,
                monthlySales,
                topProducts,
                lowStockAlerts: lowStockAlerts.map((entry) => ({
                    productId: entry.productId.toString(),
                    productName: entry.productName,
                    variantSku: entry.variantSku,
                    stock: entry.stock
                })),
                customerGrowth,
                funnel: [
                    {
                        key: 'cart_activity',
                        label: 'Cart Activity',
                        count: cartActivityResult[0]?.count ?? 0
                    },
                    {
                        key: 'quotations',
                        label: 'Quotations',
                        count: quotationCountResult[0]?.count ?? 0
                    },
                    {
                        key: 'confirmed_orders',
                        label: 'Confirmed Orders',
                        count: confirmedOrdersResult[0]?.count ?? 0
                    }
                ],
                geographicDistribution
            };
        });
    },
    exportAnalyticsPdf: async (query = {}) => {
        const analytics = await adminService.getAnalytics(query);
        const siteConfig = await siteConfigService.getConfig();
        const buffer = await generateAnalyticsPdfBuffer(analytics, siteConfig);
        const filename = `dashboard-report-${analytics.range.startDate.slice(0, 10)}-${analytics.range.endDate.slice(0, 10)}.pdf`;
        return { buffer, filename };
    },
    exportSalesAnalysisPdf: async () => {
        const salesAnalysis = await adminService.getSalesAnalysis();
        const siteConfig = await siteConfigService.getConfig();
        const buffer = await generateSalesAnalysisPdfBuffer(salesAnalysis, siteConfig);
        const filename = `sales-analysis-report-${dayjs().format('YYYY-MM-DD')}.pdf`;
        return { buffer, filename };
    },
    getSalesAnalysis: async () => cacheService.rememberVersioned(cacheNamespaces.analytics, 'sales-analysis', ANALYTICS_CACHE_TTL_SECONDS, async () => {
        const config = await siteConfigService.getOrCreateDocument();
        const now = dayjs();
        const todayStartDate = now.startOf('day');
        const todayStart = now.startOf('day');
        const todayEnd = now.endOf('day');
        const monthStart = now.startOf('month');
        const yearStart = now.startOf('year');
        const cohortWindowStart = now.startOf('month').subtract(SALES_RETENTION_WINDOW_MONTHS - 1, 'month');
        const last30Days = Array.from({ length: 30 }, (_, index) => now.subtract(29 - index, 'day'));
        const last12Months = Array.from({ length: 12 }, (_, index) => now.subtract(11 - index, 'month').startOf('month'));
        const last5Years = Array.from({ length: 5 }, (_, index) => now.subtract(4 - index, 'year').startOf('year'));
        const last30Start = last30Days[0].startOf('day').toDate();
        const monthlyWindowStart = last12Months[0].toDate();
        const yearlyWindowStart = last5Years[0].toDate();
        const [orderAnalyticsResult, customerAnalyticsResult, customerRfmResult, customerRetentionActivityResult] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        deletedAt: null,
                        isQuotation: false,
                        paymentStatus: 'paid'
                    }
                },
                {
                    $facet: {
                        daily: [
                            { $match: { createdAt: { $gte: last30Start, $lte: todayEnd.toDate() } } },
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                    revenue: { $sum: '$total' },
                                    orderCount: { $sum: 1 }
                                }
                            }
                        ],
                        monthly: [
                            { $match: { createdAt: { $gte: monthlyWindowStart, $lte: todayEnd.toDate() } } },
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                                    revenue: { $sum: '$total' },
                                    orderCount: { $sum: 1 }
                                }
                            }
                        ],
                        yearly: [
                            { $match: { createdAt: { $gte: yearlyWindowStart, $lte: todayEnd.toDate() } } },
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
                                    revenue: { $sum: '$total' },
                                    orderCount: { $sum: 1 }
                                }
                            }
                        ],
                        todayStats: [
                            { $match: { createdAt: { $gte: todayStart.toDate(), $lte: todayEnd.toDate() } } },
                            { $group: { _id: null, revenue: { $sum: '$total' }, orderCount: { $sum: 1 } } }
                        ],
                        monthToDateStats: [
                            { $match: { createdAt: { $gte: monthStart.toDate(), $lte: todayEnd.toDate() } } },
                            { $group: { _id: null, revenue: { $sum: '$total' }, orderCount: { $sum: 1 } } }
                        ],
                        yearToDateStats: [
                            { $match: { createdAt: { $gte: yearStart.toDate(), $lte: todayEnd.toDate() } } },
                            { $group: { _id: null, revenue: { $sum: '$total' }, orderCount: { $sum: 1 } } }
                        ]
                    }
                }
            ]),
            User.aggregate([
                { $match: { role: 'customer' } },
                {
                    $facet: {
                        baselineCustomers: [{ $match: { createdAt: { $lt: last30Start } } }, { $count: 'count' }],
                        customerCountsByDay: [
                            { $match: { createdAt: { $gte: last30Start, $lte: todayEnd.toDate() } } },
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ]
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        deletedAt: null,
                        isQuotation: false,
                        paymentStatus: 'paid'
                    }
                },
                {
                    $group: {
                        _id: '$user',
                        totalRevenue: { $sum: '$total' },
                        orderCount: { $sum: 1 },
                        lastOrderAt: { $max: '$createdAt' },
                        firstOrderAt: { $min: '$createdAt' }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        deletedAt: null,
                        isQuotation: false,
                        paymentStatus: 'paid',
                        createdAt: { $gte: cohortWindowStart.toDate(), $lte: todayEnd.toDate() }
                    }
                },
                {
                    $group: {
                        _id: {
                            user: '$user',
                            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
                        }
                    }
                },
                { $sort: { '_id.month': 1 } }
            ])
        ]);
        const orderAnalytics = orderAnalyticsResult[0] ?? {
            daily: [],
            monthly: [],
            yearly: [],
            todayStats: [],
            monthToDateStats: [],
            yearToDateStats: []
        };
        const customerAnalytics = customerAnalyticsResult[0] ?? {
            baselineCustomers: [],
            customerCountsByDay: []
        };
        const expenses = (await listManualExpensesWithFallback(config))
            .map(serializeManualExpense)
            .sort((left, right) => new Date(right.incurredOn).getTime() - new Date(left.incurredOn).getTime());
        const dailyRevenueMap = new Map(orderAnalytics.daily.map((entry) => [entry._id, entry.revenue]));
        const dailyOrderCountMap = new Map(orderAnalytics.daily.map((entry) => [entry._id, entry.orderCount]));
        const monthlyRevenueMap = new Map(orderAnalytics.monthly.map((entry) => [entry._id, entry.revenue]));
        const monthlyOrderCountMap = new Map(orderAnalytics.monthly.map((entry) => [entry._id, entry.orderCount]));
        const yearlyRevenueMap = new Map(orderAnalytics.yearly.map((entry) => [entry._id, entry.revenue]));
        const yearlyOrderCountMap = new Map(orderAnalytics.yearly.map((entry) => [entry._id, entry.orderCount]));
        const dailyExpenseMap = new Map();
        const monthlyExpenseMap = new Map();
        const yearlyExpenseMap = new Map();
        let todayExpenses = 0;
        let monthToDateExpenses = 0;
        let yearToDateExpenses = 0;
        expenses.forEach((expense) => {
            const incurredOn = dayjs(expense.incurredOn);
            const dayKey = incurredOn.format('YYYY-MM-DD');
            const monthKeyValue = incurredOn.format('YYYY-MM');
            const yearKeyValue = incurredOn.format('YYYY');
            dailyExpenseMap.set(dayKey, (dailyExpenseMap.get(dayKey) ?? 0) + expense.amount);
            monthlyExpenseMap.set(monthKeyValue, (monthlyExpenseMap.get(monthKeyValue) ?? 0) + expense.amount);
            yearlyExpenseMap.set(yearKeyValue, (yearlyExpenseMap.get(yearKeyValue) ?? 0) + expense.amount);
            if (incurredOn.isSame(now, 'day')) {
                todayExpenses += expense.amount;
            }
            if (incurredOn.isSame(now, 'month')) {
                monthToDateExpenses += expense.amount;
            }
            if (incurredOn.isSame(now, 'year')) {
                yearToDateExpenses += expense.amount;
            }
        });
        const dailySales = last30Days.map((day) => buildSalesPoint({
            period: day.format('YYYY-MM-DD'),
            label: day.format('MMM D'),
            revenue: dailyRevenueMap.get(day.format('YYYY-MM-DD')) ?? 0,
            expenses: dailyExpenseMap.get(day.format('YYYY-MM-DD')) ?? 0,
            orderCount: dailyOrderCountMap.get(day.format('YYYY-MM-DD')) ?? 0
        }));
        const monthlySales = last12Months.map((month) => buildSalesPoint({
            period: month.format('YYYY-MM'),
            label: monthKey(month.toDate()),
            revenue: monthlyRevenueMap.get(month.format('YYYY-MM')) ?? 0,
            expenses: monthlyExpenseMap.get(month.format('YYYY-MM')) ?? 0,
            orderCount: monthlyOrderCountMap.get(month.format('YYYY-MM')) ?? 0
        }));
        const yearlySales = last5Years.map((year) => buildSalesPoint({
            period: year.format('YYYY'),
            label: year.format('YYYY'),
            revenue: yearlyRevenueMap.get(year.format('YYYY')) ?? 0,
            expenses: yearlyExpenseMap.get(year.format('YYYY')) ?? 0,
            orderCount: yearlyOrderCountMap.get(year.format('YYYY')) ?? 0
        }));
        const strongestMonth = monthlySales.reduce((best, current) => {
            if (!best || current.revenue > best.revenue) {
                return current;
            }
            return best;
        }, null) ?? null;
        const baselineCustomers = customerAnalytics.baselineCustomers[0]?.count ?? 0;
        const customerCountsMap = new Map(customerAnalytics.customerCountsByDay.map((entry) => [entry._id, entry.count]));
        let cumulativeCustomers = baselineCustomers;
        const customerGrowth = last30Days.map((day) => {
            cumulativeCustomers += customerCountsMap.get(day.format('YYYY-MM-DD')) ?? 0;
            return {
                date: day.format('YYYY-MM-DD'),
                totalCustomers: cumulativeCustomers
            };
        });
        const customerRetentionMonthsMap = new Map();
        customerRetentionActivityResult.forEach((entry) => {
            const userId = entry._id.user.toString();
            const activeMonths = customerRetentionMonthsMap.get(userId) ?? new Set();
            activeMonths.add(entry._id.month);
            customerRetentionMonthsMap.set(userId, activeMonths);
        });
        const cohortBuckets = new Map();
        customerRfmResult.forEach((entry) => {
            const cohortMonth = dayjs(entry.firstOrderAt).startOf('month');
            if (cohortMonth.isBefore(cohortWindowStart, 'month')) {
                return;
            }
            const customerId = entry._id.toString();
            const cohortMonthKey = cohortMonth.format('YYYY-MM');
            const bucket = cohortBuckets.get(cohortMonthKey) ??
                {
                    cohortMonth,
                    customers: new Set(),
                    activeByOffset: new Map()
                };
            bucket.customers.add(customerId);
            const activeMonths = customerRetentionMonthsMap.get(customerId) ?? new Set();
            activeMonths.forEach((monthKeyValue) => {
                const offset = dayjs(`${monthKeyValue}-01`).startOf('month').diff(cohortMonth, 'month');
                if (offset < 0 || offset >= SALES_RETENTION_WINDOW_MONTHS) {
                    return;
                }
                const activeCustomers = bucket.activeByOffset.get(offset) ?? new Set();
                activeCustomers.add(customerId);
                bucket.activeByOffset.set(offset, activeCustomers);
            });
            cohortBuckets.set(cohortMonthKey, bucket);
        });
        const retentionCohorts = Array.from(cohortBuckets.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([cohortMonthKey, bucket]) => {
            const cohortSize = bucket.customers.size;
            return {
                cohortMonth: cohortMonthKey,
                cohortLabel: monthKey(bucket.cohortMonth.toDate()),
                cohortSize,
                retention: Array.from({ length: SALES_RETENTION_WINDOW_MONTHS }, (_, monthOffset) => {
                    const calendarMonth = bucket.cohortMonth.add(monthOffset, 'month');
                    const calendarMonthKey = calendarMonth.format('YYYY-MM');
                    if (calendarMonth.isAfter(now, 'month')) {
                        return {
                            monthOffset,
                            calendarMonth: calendarMonthKey,
                            calendarLabel: monthKey(calendarMonth.toDate()),
                            activeCustomers: null,
                            retentionRate: null
                        };
                    }
                    const activeCustomers = bucket.activeByOffset.get(monthOffset)?.size ?? 0;
                    return {
                        monthOffset,
                        calendarMonth: calendarMonthKey,
                        calendarLabel: monthKey(calendarMonth.toDate()),
                        activeCustomers,
                        retentionRate: cohortSize > 0 ? activeCustomers / cohortSize : null
                    };
                })
            };
        });
        const customerDetails = customerRfmResult.length
            ? await User.find({ _id: { $in: customerRfmResult.map((entry) => entry._id) } }, { name: 1, email: 1 }).lean()
            : [];
        const customerDetailMap = new Map(customerDetails.map((customer) => {
            const normalizedCustomer = customer;
            return [
                String(normalizedCustomer._id),
                {
                    name: typeof normalizedCustomer.name === 'string' && normalizedCustomer.name.trim()
                        ? normalizedCustomer.name.trim()
                        : 'Customer',
                    email: typeof normalizedCustomer.email === 'string' && normalizedCustomer.email.trim()
                        ? normalizedCustomer.email.trim()
                        : 'unknown@example.com'
                }
            ];
        }));
        const recencyValues = customerRfmResult.map((entry) => Math.max(0, todayStartDate.diff(dayjs(entry.lastOrderAt).startOf('day'), 'day')));
        const frequencyValues = customerRfmResult.map((entry) => entry.orderCount);
        const monetaryValues = customerRfmResult.map((entry) => entry.totalRevenue);
        const recencyScores = createRankScores(recencyValues, 'asc');
        const frequencyScores = createRankScores(frequencyValues, 'desc');
        const monetaryScores = createRankScores(monetaryValues, 'desc');
        const rfmCustomers = customerRfmResult
            .map((entry, index) => {
            const customerId = entry._id.toString();
            const identity = customerDetailMap.get(customerId);
            const daysSinceLastOrder = recencyValues[index] ?? 0;
            const segmentKey = assignSalesRfmSegment({
                orderCount: entry.orderCount,
                daysSinceLastOrder,
                recencyScore: recencyScores[index] ?? 3,
                frequencyScore: frequencyScores[index] ?? 3,
                monetaryScore: monetaryScores[index] ?? 3
            });
            return {
                customerId,
                name: identity?.name ?? 'Customer',
                email: identity?.email ?? 'unknown@example.com',
                segmentKey,
                segmentLabel: SALES_RFM_SEGMENT_LABELS[segmentKey],
                orderCount: entry.orderCount,
                totalRevenue: entry.totalRevenue,
                averageOrderValue: entry.orderCount > 0 ? entry.totalRevenue / entry.orderCount : 0,
                lastOrderDate: dayjs(entry.lastOrderAt).toISOString(),
                daysSinceLastOrder
            };
        })
            .sort((left, right) => {
            if (right.totalRevenue !== left.totalRevenue) {
                return right.totalRevenue - left.totalRevenue;
            }
            if (right.orderCount !== left.orderCount) {
                return right.orderCount - left.orderCount;
            }
            return new Date(right.lastOrderDate).getTime() - new Date(left.lastOrderDate).getTime();
        });
        const rfmSegments = SALES_RFM_SEGMENT_ORDER.map((segmentKey) => {
            const customersInSegment = rfmCustomers.filter((customer) => customer.segmentKey === segmentKey);
            const totalRevenue = customersInSegment.reduce((sum, customer) => sum + customer.totalRevenue, 0);
            const totalOrders = customersInSegment.reduce((sum, customer) => sum + customer.orderCount, 0);
            const totalRecencyDays = customersInSegment.reduce((sum, customer) => sum + customer.daysSinceLastOrder, 0);
            return {
                key: segmentKey,
                label: SALES_RFM_SEGMENT_LABELS[segmentKey],
                customerCount: customersInSegment.length,
                totalRevenue,
                averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                averageRecencyDays: customersInSegment.length > 0 ? Math.round(totalRecencyDays / customersInSegment.length) : 0
            };
        });
        const todayRevenue = orderAnalytics.todayStats[0]?.revenue ?? 0;
        const todayOrderCount = orderAnalytics.todayStats[0]?.orderCount ?? 0;
        const monthToDateRevenue = orderAnalytics.monthToDateStats[0]?.revenue ?? 0;
        const monthToDateOrderCount = orderAnalytics.monthToDateStats[0]?.orderCount ?? 0;
        const yearToDateRevenue = orderAnalytics.yearToDateStats[0]?.revenue ?? 0;
        const yearToDateOrderCount = orderAnalytics.yearToDateStats[0]?.orderCount ?? 0;
        return {
            snapshots: {
                today: {
                    label: 'Today',
                    revenue: todayRevenue,
                    expenses: todayExpenses,
                    net: todayRevenue - todayExpenses,
                    orderCount: todayOrderCount
                },
                monthToDate: {
                    label: 'Month to date',
                    revenue: monthToDateRevenue,
                    expenses: monthToDateExpenses,
                    net: monthToDateRevenue - monthToDateExpenses,
                    orderCount: monthToDateOrderCount
                },
                yearToDate: {
                    label: 'Year to date',
                    revenue: yearToDateRevenue,
                    expenses: yearToDateExpenses,
                    net: yearToDateRevenue - yearToDateExpenses,
                    orderCount: yearToDateOrderCount
                }
            },
            revenue: dailySales.map((point) => ({
                date: point.period,
                revenue: point.revenue
            })),
            customerGrowth,
            dailySales,
            monthlySales,
            yearlySales,
            expenses,
            strongestMonth,
            rfmSegments,
            rfmCustomers,
            retentionCohorts
        };
    }),
    createExternalExpense: async (payload) => {
        const expense = await ManualExpense.create({
            label: payload.label.trim(),
            amount: payload.amount,
            incurredOn: payload.incurredOn,
            category: payload.category?.trim() || DEFAULT_EXPENSE_CATEGORY,
            notes: payload.notes?.trim() || undefined
        });
        await clearLegacyManualExpenses();
        await invalidateSalesAnalysisCaches();
        return serializeManualExpense(expense);
    },
    updateExternalExpense: async (expenseId, payload) => {
        const config = await siteConfigService.getOrCreateDocument();
        await listManualExpensesWithFallback(config);
        const expense = await ManualExpense.findById(expenseId);
        if (!expense) {
            throw new AppError('Expense entry not found', 404);
        }
        if (payload.label !== undefined) {
            expense.label = payload.label.trim();
        }
        if (payload.amount !== undefined) {
            expense.amount = payload.amount;
        }
        if (payload.incurredOn !== undefined) {
            expense.incurredOn = payload.incurredOn;
        }
        if (payload.category !== undefined) {
            expense.category = payload.category.trim() || DEFAULT_EXPENSE_CATEGORY;
        }
        if (payload.notes !== undefined) {
            expense.notes = payload.notes.trim() || undefined;
        }
        await expense.save();
        await clearLegacyManualExpenses();
        await invalidateSalesAnalysisCaches();
        return serializeManualExpense(expense);
    },
    deleteExternalExpense: async (expenseId) => {
        const config = await siteConfigService.getOrCreateDocument();
        await listManualExpensesWithFallback(config);
        const result = await ManualExpense.findByIdAndDelete(expenseId);
        if (!result) {
            throw new AppError('Expense entry not found', 404);
        }
        await clearLegacyManualExpenses();
        await invalidateSalesAnalysisCaches();
    },
    listCategories: async () => {
        const [categories, productCounts] = await Promise.all([
            Category.find().sort({ order: 1, name: 1 }),
            Product.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ])
        ]);
        const counts = new Map(productCounts.map((entry) => [entry._id.toString(), entry.count]));
        return buildCategoryTree(categories.map((category) => ({
            _id: category._id.toString(),
            name: category.name,
            slug: category.slug,
            description: category.description,
            metaTitle: category.metaTitle,
            metaDescription: category.metaDescription,
            image: category.image,
            parent: category.parent?.toString() ?? null,
            isActive: category.isActive,
            order: category.order,
            productCount: counts.get(category._id.toString()) ?? 0
        })));
    },
    createCategory: async (payload) => {
        const category = await Category.create({
            ...payload,
            description: payload.description?.trim() || undefined,
            metaTitle: payload.metaTitle?.trim() || undefined,
            metaDescription: payload.metaDescription?.trim() || undefined,
            slug: await generateUniqueCategorySlug(payload.name),
            parent: payload.parent ?? null
        });
        await invalidateCategoryCaches();
        return serializeCategory(category.toObject());
    },
    updateCategory: async (categoryId, payload) => {
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new AppError('Category not found', 404);
        }
        if (payload.name) {
            category.name = payload.name;
            category.slug = await generateUniqueCategorySlug(payload.name, categoryId);
        }
        if (payload.description !== undefined) {
            category.description = payload.description?.trim() || undefined;
        }
        if (payload.metaTitle !== undefined) {
            category.metaTitle = payload.metaTitle?.trim() || undefined;
        }
        if (payload.metaDescription !== undefined) {
            category.metaDescription = payload.metaDescription?.trim() || undefined;
        }
        if (payload.image !== undefined) {
            if (category.image?.publicId && payload.image?.publicId && category.image.publicId !== payload.image.publicId) {
                await removeAsset(category.image.publicId);
            }
            category.image = payload.image;
        }
        if (payload.parent !== undefined) {
            category.parent = payload.parent ? payload.parent : null;
        }
        if (payload.isActive !== undefined) {
            category.isActive = payload.isActive;
        }
        if (payload.order !== undefined) {
            category.order = payload.order;
        }
        await category.save();
        await invalidateCategoryCaches();
        return serializeCategory(category.toObject());
    },
    removeCategory: async (categoryId) => {
        await Category.findByIdAndUpdate(categoryId, { isActive: false });
        await invalidateCategoryCaches();
        logger.info(`admin.category.deactivated category=${categoryId}`);
    },
    permanentlyDeleteCategory: async (categoryId) => {
        const category = await Category.findById(categoryId).select('_id image');
        if (!category) {
            throw new AppError('Category not found', 404);
        }
        const [productCount, childCount] = await Promise.all([
            Product.countDocuments({ category: category._id }),
            Category.countDocuments({ parent: category._id })
        ]);
        if (productCount > 0) {
            throw new AppError('Move or delete the products in this category before permanently deleting it.', 400);
        }
        if (childCount > 0) {
            throw new AppError('Remove or reassign child categories before permanently deleting this category.', 400);
        }
        if (category.image?.publicId) {
            await removeAsset(category.image.publicId);
        }
        await Category.findByIdAndDelete(categoryId);
        await invalidateCategoryCaches();
        logger.info(`admin.category.deleted category=${categoryId}`);
    },
    uploadCategoryImage: async (file, baseUrl, alt) => uploadBuffer({
        file,
        folder: 'categories',
        baseUrl,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        alt,
        resourceType: 'image'
    }),
    uploadProductImages: async (files, baseUrl) => Promise.all(files.map((file) => uploadBuffer({
        file,
        folder: 'products',
        baseUrl,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        resourceType: 'image'
    }))),
    uploadStoreLogo: async (file, baseUrl, alt) => uploadBuffer({
        file,
        folder: 'site-config',
        baseUrl,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        alt,
        resourceType: 'image'
    }),
    listUsers: async (page = 1, limit = 20) => {
        const [users, total] = await Promise.all([
            User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            User.countDocuments()
        ]);
        return {
            items: users.map((user) => serializeUser(user.toObject())),
            pagination: createPagination(page, limit, total)
        };
    },
    listUserLoginHistory: async (userId, limit = 10) => {
        const targetUserId = new Types.ObjectId(userId);
        const userExists = await User.exists({ _id: targetUserId });
        if (!userExists) {
            throw new AppError('User not found', 404);
        }
        const safeLimit = Math.min(20, Math.max(1, limit));
        const loginEvents = await AuditLog.find({
            actorUser: targetUserId,
            action: { $in: ['auth.login', 'auth.google_login'] },
            status: 'success'
        })
            .sort({ createdAt: -1 })
            .limit(safeLimit);
        if (loginEvents.length > 0) {
            return loginEvents.map((entry) => {
                const metadata = (entry.metadata ?? {});
                return {
                    id: entry._id.toString(),
                    method: entry.action === 'auth.google_login' ? 'google' : 'password',
                    ipAddress: entry.ipAddress ?? undefined,
                    userAgent: entry.userAgent ?? undefined,
                    rememberMe: typeof metadata.rememberMe === 'boolean' ? metadata.rememberMe : undefined,
                    createdAt: entry.createdAt.toISOString()
                };
            });
        }
        const sessions = await RefreshSession.find({ user: targetUserId }).sort({ createdAt: -1 }).limit(safeLimit);
        return sessions.map((session) => ({
            id: session.sessionId,
            method: 'session',
            ipAddress: session.ipAddress ?? undefined,
            userAgent: session.userAgent ?? undefined,
            rememberMe: session.rememberMe,
            createdAt: session.createdAt.toISOString()
        }));
    },
    mergeUsers: async (keepUserId, mergeUserId, actingUserId) => {
        if (keepUserId === mergeUserId) {
            throw new AppError('Choose two different user accounts to merge', 400);
        }
        if (mergeUserId === actingUserId) {
            throw new AppError('You cannot merge the account you are currently using into another account', 400);
        }
        const session = await mongoose.startSession();
        let mergeResult = null;
        const affectedProductIds = [];
        try {
            await session.withTransaction(async () => {
                const [keepUser, mergeUser] = await Promise.all([
                    User.findById(keepUserId).session(session),
                    User.findById(mergeUserId).session(session)
                ]);
                if (!keepUser || !mergeUser) {
                    throw new AppError('User not found', 404);
                }
                if (keepUser.role !== 'customer' || mergeUser.role !== 'customer') {
                    throw new AppError('Only customer accounts can be merged at the moment', 400);
                }
                const [orderTransferResult, loyaltyTransferResult, keepWishlist, mergeWishlist, keepCompareList, mergeCompareList, keepCart, mergeCart, mergeReviews, keepReviews, helpfulReviews, couponDocuments, activeSessionCount] = await Promise.all([
                    Order.updateMany({ user: mergeUser._id }, { user: keepUser._id }, { session }),
                    LoyaltyTransaction.updateMany({ user: mergeUser._id }, { user: keepUser._id }, { session }),
                    Wishlist.findOne({ user: keepUser._id }).session(session),
                    Wishlist.findOne({ user: mergeUser._id }).session(session),
                    CompareList.findOne({ user: keepUser._id }).session(session),
                    CompareList.findOne({ user: mergeUser._id }).session(session),
                    Cart.findOne({ user: keepUser._id }).session(session),
                    Cart.findOne({ user: mergeUser._id }).session(session),
                    Review.find({ user: mergeUser._id }).session(session),
                    Review.find({ user: keepUser._id }).session(session),
                    Review.find({ helpfulBy: mergeUser._id }).session(session),
                    Coupon.find({ 'usedBy.user': { $in: [keepUser._id, mergeUser._id] } }).session(session),
                    RefreshSession.countDocuments({ user: mergeUser._id, revokedAt: null, expiresAt: { $gt: new Date() } }).session(session)
                ]);
                const remapReference = (item) => item.toString() === mergeUser._id.toString() ? keepUser._id : item;
                const keepReviewsByProduct = new Map(keepReviews.map((review) => [review.product.toString(), review]));
                let reviewsMoved = 0;
                let reviewsDiscarded = 0;
                for (const review of mergeReviews) {
                    affectedProductIds.push(review.product);
                    const existingKeepReview = keepReviewsByProduct.get(review.product.toString());
                    if (existingKeepReview) {
                        existingKeepReview.helpfulBy = mergeUniqueObjectIds((existingKeepReview.helpfulBy ?? []).map((entry) => remapReference(entry)), (review.helpfulBy ?? []).map((entry) => remapReference(entry)));
                        existingKeepReview.helpfulVotes = existingKeepReview.helpfulBy.length;
                        existingKeepReview.adminReply = mergeUniqueText(existingKeepReview.adminReply, review.adminReply);
                        existingKeepReview.adminRepliedAt = existingKeepReview.adminRepliedAt ?? review.adminRepliedAt;
                        await existingKeepReview.save({ session });
                        await review.deleteOne({ session });
                        reviewsDiscarded += 1;
                        continue;
                    }
                    review.user = keepUser._id;
                    review.helpfulBy = mergeUniqueObjectIds((review.helpfulBy ?? []).map((entry) => remapReference(entry)), []);
                    review.helpfulVotes = review.helpfulBy.length;
                    await review.save({ session });
                    keepReviewsByProduct.set(review.product.toString(), review);
                    reviewsMoved += 1;
                }
                for (const review of helpfulReviews) {
                    review.helpfulBy = mergeUniqueObjectIds((review.helpfulBy ?? []).map((entry) => remapReference(entry)), []);
                    review.helpfulVotes = review.helpfulBy.length;
                    await review.save({ session });
                }
                let couponUsageEntriesRetargeted = 0;
                for (const coupon of couponDocuments) {
                    const nextUsedBy = [];
                    const seenUserIds = new Set();
                    for (const entry of coupon.usedBy ?? []) {
                        const nextUserId = entry.user.toString() === mergeUser._id.toString() ? keepUser._id : entry.user;
                        if (entry.user.toString() === mergeUser._id.toString()) {
                            couponUsageEntriesRetargeted += 1;
                        }
                        if (seenUserIds.has(nextUserId.toString())) {
                            continue;
                        }
                        seenUserIds.add(nextUserId.toString());
                        nextUsedBy.push({
                            user: nextUserId,
                            usedAt: entry.usedAt
                        });
                    }
                    coupon.usedBy = nextUsedBy;
                    coupon.usedCount = nextUsedBy.length;
                    await coupon.save({ session });
                }
                const mergedWishlistItems = mergeUniqueObjectIds(mergeUniqueObjectIds(keepUser.wishlist ?? [], keepWishlist?.items ?? []), mergeUniqueObjectIds(mergeUser.wishlist ?? [], mergeWishlist?.items ?? []));
                keepUser.wishlist = mergedWishlistItems;
                if (keepWishlist) {
                    keepWishlist.items = mergedWishlistItems;
                    await keepWishlist.save({ session });
                }
                else if (mergedWishlistItems.length > 0) {
                    await Wishlist.create([{ user: keepUser._id, items: mergedWishlistItems }], { session });
                }
                if (mergeWishlist) {
                    await mergeWishlist.deleteOne({ session });
                }
                const mergedCompareItems = mergeUniqueObjectIds(keepCompareList?.items ?? [], mergeCompareList?.items ?? []).slice(0, 4);
                if (keepCompareList) {
                    keepCompareList.items = mergedCompareItems;
                    await keepCompareList.save({ session });
                }
                else if (mergedCompareItems.length > 0) {
                    await CompareList.create([{ user: keepUser._id, items: mergedCompareItems }], { session });
                }
                if (mergeCompareList) {
                    await mergeCompareList.deleteOne({ session });
                }
                const mergedCartItems = mergeCartItems(keepCart?.items ?? [], mergeCart?.items ?? []);
                if (keepCart) {
                    keepCart.items = mergedCartItems;
                    await keepCart.save({ session });
                }
                else if (mergedCartItems.length > 0) {
                    await Cart.create([{ user: keepUser._id, items: mergedCartItems }], { session });
                }
                if (mergeCart) {
                    await mergeCart.deleteOne({ session });
                }
                keepUser.isActive = Boolean(keepUser.isActive || mergeUser.isActive);
                keepUser.isEmailVerified = Boolean(keepUser.isEmailVerified || mergeUser.isEmailVerified);
                keepUser.loyaltyPoints = Math.max(0, (keepUser.loyaltyPoints ?? 0) + (mergeUser.loyaltyPoints ?? 0));
                keepUser.phone = keepUser.phone?.trim() || mergeUser.phone?.trim() || undefined;
                keepUser.avatar = keepUser.avatar ?? mergeUser.avatar;
                keepUser.googleId = keepUser.googleId ?? mergeUser.googleId;
                keepUser.authProvider = keepUser.googleId || mergeUser.authProvider === 'google' ? 'google' : keepUser.authProvider;
                keepUser.addresses = mergeAddresses(keepUser.addresses ?? [], mergeUser.addresses ?? []);
                keepUser.recentlyViewed = mergeUniqueObjectIds(keepUser.recentlyViewed ?? [], mergeUser.recentlyViewed ?? []);
                keepUser.shopPreferences = keepUser.shopPreferences?.myFilters ? keepUser.shopPreferences : mergeUser.shopPreferences;
                keepUser.permissions = [];
                await keepUser.save({ session });
                await Promise.all([
                    RefreshSession.deleteMany({ user: mergeUser._id }).session(session),
                    User.deleteOne({ _id: mergeUser._id }).session(session)
                ]);
                mergeResult = {
                    keepUser: serializeUser(keepUser.toObject()),
                    mergedUserId: mergeUser._id.toString(),
                    transferred: {
                        orders: orderTransferResult.modifiedCount ?? 0,
                        reviewsMoved,
                        reviewsDiscarded,
                        loyaltyTransactions: loyaltyTransferResult.modifiedCount ?? 0,
                        activeSessionsRevoked: activeSessionCount,
                        wishlistItems: (mergeWishlist?.items ?? mergeUser.wishlist ?? []).length,
                        compareItems: (mergeCompareList?.items ?? []).length,
                        cartItems: (mergeCart?.items ?? []).length,
                        couponUsageEntriesRetargeted,
                    }
                };
            });
        }
        finally {
            await session.endSession();
        }
        if (!mergeResult) {
            throw new AppError('Transaction failed', 500);
        }
        if (affectedProductIds.length > 0) {
            await syncReviewRatingsForProducts(affectedProductIds);
        }
        await Promise.all([invalidateCachedUser(keepUserId), invalidateCachedUser(mergeUserId), invalidateAnalyticsCaches()]);
        logger.info(`admin.user.merged keep=${keepUserId} merged=${mergeUserId} actor=${actingUserId}`);
        return mergeResult;
    },
    getBroadcastAudienceSummary: async () => {
        const [customers, unverifiedCustomers, newsletterSubscribers] = await Promise.all([
            fetchCustomerBroadcastEmails(),
            fetchUnverifiedCustomerBroadcastEmails(),
            fetchNewsletterBroadcastEmails()
        ]);
        return {
            customers: customers.length,
            unverifiedCustomers: unverifiedCustomers.length,
            newsletterSubscribers: newsletterSubscribers.length,
            totalUniqueRecipients: dedupeEmails([...customers, ...unverifiedCustomers, ...newsletterSubscribers]).length
        };
    },
    sendBroadcastEmail: async (payload, baseUrl) => {
        const subject = payload.subject.trim();
        const previewText = payload.previewText?.trim() || undefined;
        const headline = payload.headline.trim();
        const body = payload.body.trim();
        const ctaLabel = payload.ctaLabel?.trim() || undefined;
        const ctaUrl = resolveBroadcastCtaUrl(payload.ctaUrl, baseUrl);
        const recipients = await getBroadcastRecipientEmails(payload.audience, payload.recipientUserIds);
        if (recipients.length === 0) {
            throw new AppError('No recipients are available for this audience right now.', 400);
        }
        let sent = 0;
        let failed = 0;
        for (let index = 0; index < recipients.length; index += EMAIL_BATCH_SIZE) {
            const batch = recipients.slice(index, index + EMAIL_BATCH_SIZE);
            const results = await Promise.allSettled(batch.map((to) => emailService.sendAdminBroadcast({
                to,
                subject,
                previewText,
                headline,
                body,
                ctaLabel,
                ctaUrl,
                audienceLabel: broadcastAudienceLabels[payload.audience]
            })));
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    sent += 1;
                }
                else {
                    failed += 1;
                    logger.error(`admin.broadcast.delivery_failed audience=${payload.audience} error=${result.reason instanceof Error ? result.reason.message : 'unknown'}`);
                }
            }
        }
        logger.info(`admin.broadcast.sent audience=${payload.audience} requested=${recipients.length} sent=${sent} failed=${failed}`);
        return {
            audience: payload.audience,
            subject,
            requestedRecipients: recipients.length,
            sent,
            failed
        };
    },
    updateUser: async (userId, payload, actingUserId) => {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        if (userId === actingUserId) {
            if (payload.role === 'customer') {
                throw new AppError('You cannot remove your own admin role', 400);
            }
            if (payload.isActive === false) {
                throw new AppError('You cannot deactivate your own account', 400);
            }
            if (payload.permissions !== undefined &&
                !SELF_MANAGED_ADMIN_PERMISSIONS.every((permission) => payload.permissions?.includes(permission))) {
                throw new AppError('Your own admin account must keep user view and edit access', 400);
            }
        }
        if (payload.role !== undefined) {
            user.role = payload.role;
        }
        if (payload.isActive !== undefined) {
            user.isActive = payload.isActive;
        }
        if (user.role === 'customer') {
            user.permissions = [];
        }
        else if (payload.permissions !== undefined) {
            user.permissions = [...new Set(payload.permissions)];
        }
        else if (!user.permissions || user.permissions.length === 0) {
            user.permissions = getDefaultPermissionsForRole(user.role);
        }
        await user.save();
        if (payload.isActive === false) {
            await invalidateCachedUserSessions(userId);
        }
        await invalidateCachedUser(userId);
        await invalidateAnalyticsCaches();
        return serializeUser(user.toObject());
    },
    removeUser: async (userId, actingUserId) => {
        if (userId === actingUserId) {
            throw new AppError('You cannot deactivate your own account', 400);
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        if ((user.role === 'admin' || user.role === 'staff') && user.isActive) {
            const activeWorkspaceCount = await User.countDocuments({ role: { $in: ['admin', 'staff'] }, isActive: true });
            if (activeWorkspaceCount <= 1) {
                throw new AppError('At least one active admin must remain', 400);
            }
        }
        user.isActive = false;
        await user.save();
        await invalidateCachedUserSessions(userId);
        await invalidateCachedUser(userId);
        await invalidateAnalyticsCaches();
        logger.info(`admin.user.deactivated target=${userId} actor=${actingUserId}`);
    },
    permanentlyDeleteUser: async (userId, actingUserId) => {
        if (userId === actingUserId) {
            throw new AppError('You cannot delete your own account', 400);
        }
        const user = await User.findById(userId).select('_id role isActive');
        if (!user) {
            throw new AppError('User not found', 404);
        }
        if ((user.role === 'admin' || user.role === 'staff') && user.isActive) {
            const activeWorkspaceCount = await User.countDocuments({
                role: { $in: ['admin', 'staff'] },
                isActive: true,
                _id: { $ne: user._id }
            });
            if (activeWorkspaceCount === 0) {
                throw new AppError('At least one active admin must remain', 400);
            }
        }
        const [orderCount, reviewCount] = await Promise.all([
            Order.countDocuments({ user: user._id }),
            Review.countDocuments({ user: user._id })
        ]);
        if (orderCount > 0 || reviewCount > 0) {
            throw new AppError('This user has order or review history. Deactivate the account instead.', 400);
        }
        await invalidateCachedUserSessions(userId);
        await Promise.all([
            Wishlist.deleteMany({ user: user._id }),
            CompareList.deleteMany({ user: user._id }),
            RefreshSession.deleteMany({ user: user._id }),
            LoyaltyTransaction.deleteMany({ user: user._id }),
            Cart.deleteMany({ user: user._id }),
            User.findByIdAndDelete(userId)
        ]);
        await invalidateCachedUser(userId);
        await invalidateAnalyticsCaches();
        logger.info(`admin.user.deleted target=${userId} actor=${actingUserId}`);
    },
    listCoupons: async () => {
        const [coupons, couponPerformance] = await Promise.all([
            Coupon.find().sort({ createdAt: -1 }).lean(),
            Order.aggregate([
                {
                    $match: {
                        deletedAt: null,
                        isQuotation: false,
                        paymentStatus: 'paid',
                        status: { $ne: 'cancelled' },
                        couponCode: { $exists: true, $nin: [null, ''] }
                    }
                },
                {
                    $group: {
                        _id: '$couponCode',
                        orderCount: { $sum: 1 },
                        revenueGenerated: { $sum: '$total' },
                        discountTotal: { $sum: '$discount' }
                    }
                }
            ])
        ]);
        const performanceByCode = new Map(couponPerformance.map((entry) => [
            entry._id,
            {
                orderCount: entry.orderCount,
                revenueGenerated: entry.revenueGenerated,
                discountTotal: entry.discountTotal
            }
        ]));
        return coupons.map((coupon) => ({
            ...coupon,
            performance: performanceByCode.get(coupon.code) ?? {
                orderCount: 0,
                revenueGenerated: 0,
                discountTotal: 0
            }
        }));
    },
    createCoupon: async (payload) => {
        const normalizedPayload = normalizeCouponPayload(payload);
        return Coupon.create({
            ...normalizedPayload,
            minOrderValue: normalizedPayload.minOrderValue,
            maxDiscount: normalizedPayload.maxDiscount,
            restrictToEmail: normalizedPayload.restrictToEmail
        });
    },
    updateCoupon: async (couponId, payload) => {
        const normalizedPayload = normalizeCouponPayload(payload);
        const fieldsToUnset = Object.fromEntries([
            ['minOrderValue', payload.minOrderValue],
            ['maxDiscount', payload.maxDiscount],
            ['restrictToEmail', payload.restrictToEmail],
            ['bogo', payload.bogo]
        ]
            .filter(([, value]) => value === null)
            .map(([key]) => [key, 1]));
        const fieldsToSet = Object.fromEntries(Object.entries(normalizedPayload).filter(([, value]) => value !== undefined && value !== null));
        const coupon = await Coupon.findByIdAndUpdate(couponId, {
            ...(Object.keys(fieldsToSet).length ? { $set: fieldsToSet } : {}),
            ...(Object.keys(fieldsToUnset).length ? { $unset: fieldsToUnset } : {})
        }, { new: true });
        if (!coupon) {
            throw new AppError('Coupon not found', 404);
        }
        return coupon;
    },
    removeCoupon: async (couponId) => {
        await Coupon.findByIdAndUpdate(couponId, { isActive: false });
        logger.info(`admin.coupon.deactivated coupon=${couponId}`);
    },
    getSettings: async () => siteConfigService.getConfig(),
    updateSettings: async (payload) => siteConfigService.updateConfig(payload),
    listPendingReviewsCount: async () => Review.countDocuments({ isApproved: false })
};
