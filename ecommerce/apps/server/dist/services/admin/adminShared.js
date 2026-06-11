import { Types } from 'mongoose';
import { RefreshSession } from '../../models/RefreshSession.js';
import { Review } from '../../models/Review.js';
import { Product } from '../../models/Product.js';
import { cacheKeys, cacheNamespaces, cacheService } from '../cacheService.js';
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const normalizeEmailAddress = (value) => value.trim().toLowerCase();
export const normalizeComparableText = (value) => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
export const SELF_MANAGED_ADMIN_PERMISSIONS = ['user:read', 'user:write'];
export const invalidateCategoryCaches = async () => {
    await Promise.all([
        cacheService.bumpNamespace(cacheNamespaces.categories),
        cacheService.bumpNamespace(cacheNamespaces.products)
    ]);
};
export const invalidateAnalyticsCaches = async () => {
    await cacheService.bumpNamespace(cacheNamespaces.analytics);
};
export const invalidateSalesAnalysisCaches = async () => {
    await Promise.all([
        cacheService.bumpNamespace(cacheNamespaces.analytics),
        cacheService.bumpNamespace(cacheNamespaces.siteConfig)
    ]);
};
export const invalidateCachedUser = async (userId, options) => {
    const sessionIds = options?.includeSessions
        ? await RefreshSession.find({ user: userId }).select('sessionId').lean()
        : [];
    await Promise.all([
        cacheService.delete(cacheKeys.authUser(userId)),
        sessionIds.length
            ? cacheService.deleteMany(sessionIds.map((session) => cacheKeys.authSession(session.sessionId)))
            : Promise.resolve()
    ]);
};
export const syncReviewRatingsForProducts = async (productIds) => {
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
export const mergeUniqueObjectIds = (left = [], right = []) => {
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
export const mergeUniqueText = (left, right) => {
    const values = [left, right].map((value) => value?.trim()).filter((value) => Boolean(value));
    return values.length ? [...new Set(values)].join(' / ') : undefined;
};
export const dedupeEmails = (emails) => [...new Set(emails.map(normalizeEmailAddress).filter(Boolean))];
