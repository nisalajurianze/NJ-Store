import mongoose, { Types } from 'mongoose';
import { AuditLog } from '../../models/AuditLog.js';
import { Cart } from '../../models/Cart.js';
import { CompareList } from '../../models/CompareList.js';
import { CouponUsage } from '../../models/CouponUsage.js';
import { LoyaltyTransaction } from '../../models/LoyaltyTransaction.js';
import { Order } from '../../models/Order.js';
import { RefreshSession } from '../../models/RefreshSession.js';
import { Review } from '../../models/Review.js';
import { ReviewHelpfulVote } from '../../models/ReviewHelpfulVote.js';
import { User } from '../../models/User.js';
import { Wishlist } from '../../models/Wishlist.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { createPagination } from '../../utils/pagination.js';
import { serializeUser } from '../../utils/serializers.js';
import { escapeRegExp, invalidateAnalyticsCaches, invalidateCachedUser, mergeUniqueObjectIds, mergeUniqueText, normalizeComparableText, syncReviewRatingsForProducts, SELF_MANAGED_ADMIN_PERMISSIONS } from './adminShared.js';
const emptyAdminUserOrderStats = {
    totalOrders: 0,
    totalSpend: 0
};
const buildAdminUserOrderStatsMap = async (userIds) => {
    if (userIds.length === 0) {
        return new Map();
    }
    const aggregatedStats = await Order.aggregate([
        {
            $match: {
                user: { $in: userIds },
                deletedAt: null,
                isQuotation: false
            }
        },
        {
            $group: {
                _id: '$user',
                totalOrders: { $sum: 1 },
                totalSpend: { $sum: '$total' },
                lastOrderAt: { $max: '$createdAt' }
            }
        }
    ]);
    return new Map(aggregatedStats.map((entry) => [
        entry._id.toString(),
        {
            totalOrders: entry.totalOrders,
            totalSpend: entry.totalSpend,
            lastOrderAt: entry.lastOrderAt?.toISOString()
        }
    ]));
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
export const userAdminService = {
    listUsers: async (options) => {
        const page = Math.max(1, options?.page ?? 1);
        const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
        const query = {};
        const trimmedSearch = options?.search?.trim();
        if (!options?.includeInactive) {
            query.isActive = true;
        }
        if (options?.role === 'workspace') {
            query.role = { $in: ['admin', 'staff'] };
        }
        else if (options?.role) {
            query.role = options.role;
        }
        if (options?.verification === 'verified') {
            query.isEmailVerified = true;
        }
        else if (options?.verification === 'unverified') {
            query.isEmailVerified = false;
        }
        if (trimmedSearch) {
            const pattern = new RegExp(escapeRegExp(trimmedSearch), 'i');
            query.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
        }
        const [users, total] = await Promise.all([
            User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            User.countDocuments(query)
        ]);
        const userIds = users.map((user) => new Types.ObjectId(user._id));
        const orderStatsByUserId = await buildAdminUserOrderStatsMap(userIds);
        return {
            items: users.map((user) => {
                const serializedUser = serializeUser(user.toObject());
                return {
                    ...serializedUser,
                    orderStats: orderStatsByUserId.get(serializedUser.id) ?? emptyAdminUserOrderStats
                };
            }),
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
                const [orderTransferResult, loyaltyTransferResult, keepWishlist, mergeWishlist, keepCompareList, mergeCompareList, keepCart, mergeCart, mergeReviews, keepReviews, couponUsageTransferResult, activeSessionCount] = await Promise.all([
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
                    CouponUsage.updateMany({ user: mergeUser._id }, { user: keepUser._id }, { session }),
                    RefreshSession.countDocuments({ user: mergeUser._id, revokedAt: null, expiresAt: { $gt: new Date() } }).session(session)
                ]);
                const keepReviewsByProduct = new Map(keepReviews.map((review) => [review.product.toString(), review]));
                const affectedHelpfulReviewIds = new Set();
                const upsertHelpfulVoteReference = async (vote, reviewId) => {
                    if (!vote) {
                        return;
                    }
                    const nextUserId = vote.user.toString() === mergeUser._id.toString() ? keepUser._id : vote.user;
                    const existingVote = await ReviewHelpfulVote.findOne({
                        _id: { $ne: vote._id },
                        review: reviewId,
                        user: nextUserId
                    }).session(session);
                    if (existingVote) {
                        await vote.deleteOne({ session });
                        affectedHelpfulReviewIds.add(reviewId.toString());
                        return;
                    }
                    vote.review = reviewId;
                    vote.user = nextUserId;
                    await vote.save({ session });
                    affectedHelpfulReviewIds.add(reviewId.toString());
                };
                const transferHelpfulVotes = async (fromReviewId, toReviewId = fromReviewId) => {
                    const votes = await ReviewHelpfulVote.find({ review: fromReviewId }).session(session);
                    for (const vote of votes) {
                        await upsertHelpfulVoteReference(vote, toReviewId);
                    }
                };
                const retargetHelpfulVotesForMergedUser = async () => {
                    const votes = await ReviewHelpfulVote.find({ user: mergeUser._id }).session(session);
                    for (const vote of votes) {
                        await upsertHelpfulVoteReference(vote, vote.review);
                    }
                };
                const syncHelpfulVoteCounts = async () => {
                    for (const reviewId of affectedHelpfulReviewIds) {
                        const count = await ReviewHelpfulVote.countDocuments({ review: reviewId }).session(session);
                        await Review.updateOne({ _id: reviewId }, { helpfulVotes: count }, { session });
                    }
                };
                let reviewsMoved = 0;
                let reviewsDiscarded = 0;
                for (const review of mergeReviews) {
                    affectedProductIds.push(review.product);
                    const existingKeepReview = keepReviewsByProduct.get(review.product.toString());
                    if (existingKeepReview) {
                        await transferHelpfulVotes(review._id, existingKeepReview._id);
                        existingKeepReview.adminReply = mergeUniqueText(existingKeepReview.adminReply, review.adminReply);
                        existingKeepReview.adminRepliedAt = existingKeepReview.adminRepliedAt ?? review.adminRepliedAt;
                        await existingKeepReview.save({ session });
                        await review.deleteOne({ session });
                        reviewsDiscarded += 1;
                        continue;
                    }
                    review.user = keepUser._id;
                    await transferHelpfulVotes(review._id);
                    await review.save({ session });
                    keepReviewsByProduct.set(review.product.toString(), review);
                    reviewsMoved += 1;
                }
                await retargetHelpfulVotesForMergedUser();
                await syncHelpfulVoteCounts();
                const couponUsageEntriesRetargeted = couponUsageTransferResult.modifiedCount ?? 0;
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
        const previousRole = user.role;
        if (payload.role !== undefined) {
            user.role = payload.role;
        }
        if (payload.isActive !== undefined) {
            user.isActive = payload.isActive;
        }
        const roleChanged = payload.role !== undefined && payload.role !== previousRole;
        if (user.role === 'customer') {
            user.permissions = [];
        }
        else if (payload.permissions !== undefined) {
            user.permissions = [...new Set(payload.permissions)];
        }
        else if (roleChanged) {
            // Clearing explicit permissions lets the role preset resolve at auth/serialization time.
            user.permissions = [];
        }
        else if (!Array.isArray(user.permissions)) {
            user.permissions = [];
        }
        await user.save();
        await invalidateCachedUser(userId, { includeSessions: payload.isActive === false });
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
        await invalidateCachedUser(userId, { includeSessions: true });
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
        await Promise.all([
            Wishlist.deleteMany({ user: user._id }),
            CompareList.deleteMany({ user: user._id }),
            RefreshSession.deleteMany({ user: user._id }),
            LoyaltyTransaction.deleteMany({ user: user._id }),
            Cart.deleteMany({ user: user._id }),
            User.findByIdAndDelete(userId)
        ]);
        await invalidateCachedUser(userId, { includeSessions: true });
        await invalidateAnalyticsCaches();
        logger.info(`admin.user.deleted target=${userId} actor=${actingUserId}`);
    }
};
