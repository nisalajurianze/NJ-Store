import { Types } from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { CouponUsage } from '../models/CouponUsage.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { resolveRequestedVariantSelection } from '../utils/productVariantSelection.js';
import { auditLogService } from './auditLogService.js';
const normalizeCode = (code) => code.trim().toUpperCase();
const normalizeEmail = (email) => email.trim().toLowerCase();
const hydrateCouponLineItems = async (items) => {
    if (!items?.length) {
        return [];
    }
    const products = await Product.find({
        _id: { $in: items.map((item) => new Types.ObjectId(item.productId)) },
        isActive: true
    })
        .select('price variants category brand productType')
        .lean();
    return items.map((item) => {
        const product = products.find((entry) => entry._id.toString() === item.productId);
        if (!product) {
            throw new AppError('One or more coupon items are unavailable.', 404);
        }
        const selection = resolveRequestedVariantSelection(product, item.variantIndex, {
            invalidSelectionMessage: 'One or more coupon variants are unavailable.'
        });
        return {
            productId: product._id.toString(),
            quantity: item.quantity,
            unitPrice: selection.variant?.price ?? product.price,
            categoryId: product.category?.toString() ?? null,
            brandId: product.brand?.toString() ?? null
        };
    });
};
const buildFallbackCouponLineItems = (subtotal) => [
    {
        productId: 'subtotal',
        quantity: 1,
        unitPrice: subtotal,
        categoryId: null,
        brandId: null
    }
];
const hasCompletedOrderHistory = async (userId) => Boolean(await Order.exists({
    user: userId,
    isQuotation: false,
    deletedAt: null,
    status: { $ne: 'cancelled' }
}));
const getUserCouponUsageCount = async (couponId, userId) => CouponUsage.countDocuments({ coupon: new Types.ObjectId(couponId), user: new Types.ObjectId(userId) });
const filterEligibleLineItems = (coupon, lineItems) => {
    const categoryIds = new Set((coupon.appliesToCategories ?? []).map((value) => value.toString()));
    const brandIds = new Set((coupon.appliesToBrands ?? []).map((value) => value.toString()));
    const hasCategoryFilter = categoryIds.size > 0;
    const hasBrandFilter = brandIds.size > 0;
    if (!hasCategoryFilter && !hasBrandFilter) {
        return lineItems;
    }
    return lineItems.filter((item) => {
        const categoryMatches = !hasCategoryFilter || (item.categoryId ? categoryIds.has(item.categoryId) : false);
        const brandMatches = !hasBrandFilter || (item.brandId ? brandIds.has(item.brandId) : false);
        return categoryMatches && brandMatches;
    });
};
const calculateCouponDiscount = (coupon, lineItems, subtotal, shippingFee) => {
    if (!lineItems.length) {
        throw new AppError('Coupon line items are required.', 400);
    }
    const usesFallbackSubtotalOnly = lineItems.some((item) => item.productId === 'subtotal');
    if (coupon.type === 'bogo' && usesFallbackSubtotalOnly) {
        throw new AppError('Product line items are required for BOGO coupons.', 400);
    }
    if ((coupon.appliesToCategories?.length || coupon.appliesToBrands?.length) && usesFallbackSubtotalOnly) {
        throw new AppError('Product line items are required for category or brand coupons.', 400);
    }
    const eligibleItems = filterEligibleLineItems(coupon, lineItems);
    if (!eligibleItems.length) {
        throw new AppError('Coupon does not apply to the selected products.', 400);
    }
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    let discount = 0;
    let freeShipping = false;
    if (coupon.type === 'percentage') {
        discount = eligibleSubtotal * (coupon.value / 100);
    }
    else if (coupon.type === 'fixed') {
        discount = coupon.value;
    }
    else if (coupon.type === 'free_shipping') {
        discount = shippingFee;
        freeShipping = true;
    }
    else {
        const buyQuantity = Math.max(coupon.bogo?.buyQuantity ?? 1, 1);
        const getQuantity = Math.max(coupon.bogo?.getQuantity ?? 1, 1);
        const unitPrices = eligibleItems.flatMap((item) => Array.from({ length: item.quantity }, () => item.unitPrice));
        const freeUnits = Math.floor(unitPrices.length / (buyQuantity + getQuantity)) * getQuantity;
        discount = unitPrices
            .sort((left, right) => left - right)
            .slice(0, freeUnits)
            .reduce((sum, price) => sum + price, 0);
    }
    if (coupon.type !== 'free_shipping') {
        discount = Math.min(discount, eligibleSubtotal);
    }
    if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
    }
    discount = Math.min(discount, subtotal + shippingFee);
    return {
        discount,
        finalTotal: Math.max(subtotal + shippingFee - discount, 0),
        freeShipping
    };
};
const assertCouponEligibility = async (coupon, payload) => {
    if (coupon.expiryDate < new Date()) {
        throw new AppError('Coupon has expired', 400);
    }
    if (coupon.usedCount >= coupon.usageLimit) {
        throw new AppError('Coupon usage limit reached', 400);
    }
    if (payload.subtotal < (coupon.minOrderValue ?? 0)) {
        throw new AppError('Order total does not meet coupon minimum', 400);
    }
    if (coupon.restrictToEmail && coupon.restrictToEmail !== normalizeEmail(payload.userEmail)) {
        throw new AppError('Coupon is restricted to a different email address', 400);
    }
    if ((await getUserCouponUsageCount(coupon._id.toString(), payload.userId)) >= (coupon.perUserLimit ?? 1)) {
        throw new AppError('Coupon usage limit reached for this account', 400);
    }
    if (coupon.isFirstOrderOnly && (await hasCompletedOrderHistory(payload.userId))) {
        throw new AppError('Coupon is available only on the first completed order', 400);
    }
};
const buildResult = (coupon, outcome, autoApplied = false) => ({
    couponId: coupon._id.toString(),
    code: coupon.code,
    discount: outcome.discount,
    finalTotal: outcome.finalTotal,
    freeShipping: outcome.freeShipping,
    autoApplied
});
const findBestAutoCoupon = async (payload, lineItems) => {
    const hasPriorOrder = await hasCompletedOrderHistory(payload.userId);
    if (hasPriorOrder) {
        return null;
    }
    const coupons = await Coupon.find({
        isActive: true,
        autoApply: true,
        isFirstOrderOnly: true
    }).sort({ createdAt: -1 });
    let bestCoupon = null;
    for (const coupon of coupons) {
        try {
            await assertCouponEligibility(coupon, payload);
            const outcome = calculateCouponDiscount(coupon, lineItems, payload.subtotal, payload.shippingFee ?? 0);
            const candidate = buildResult(coupon, outcome, true);
            if (!bestCoupon || candidate.discount > bestCoupon.discount) {
                bestCoupon = candidate;
            }
        }
        catch {
            continue;
        }
    }
    return bestCoupon;
};
export const couponService = {
    validateCoupon: async ({ userId, userEmail, code, subtotal, shippingFee = 0, items }) => {
        if (!code?.trim()) {
            throw new AppError('Coupon code is required', 400);
        }
        const normalizedCode = normalizeCode(code);
        const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });
        if (!coupon) {
            throw new AppError('Coupon not found', 404);
        }
        await assertCouponEligibility(coupon, { userId, userEmail, subtotal });
        const hydratedLineItems = await hydrateCouponLineItems(items);
        const lineItems = hydratedLineItems.length ? hydratedLineItems : buildFallbackCouponLineItems(subtotal);
        const outcome = calculateCouponDiscount(coupon, lineItems, subtotal, shippingFee);
        return buildResult(coupon, outcome);
    },
    resolveBestDiscount: async ({ userId, userEmail, code, subtotal, shippingFee = 0, items }) => {
        const hydratedLineItems = await hydrateCouponLineItems(items);
        const lineItems = hydratedLineItems.length ? hydratedLineItems : buildFallbackCouponLineItems(subtotal);
        if (code?.trim()) {
            const result = await couponService.validateCoupon({
                userId,
                userEmail,
                code,
                subtotal,
                shippingFee,
                items
            });
            return result;
        }
        const autoCoupon = await findBestAutoCoupon({
            userId,
            userEmail,
            subtotal,
            shippingFee,
            items
        }, lineItems);
        if (!autoCoupon) {
            return {
                discount: 0,
                finalTotal: subtotal + shippingFee,
                freeShipping: false
            };
        }
        return autoCoupon;
    },
    consumeCoupon: async (couponId, userId, session) => {
        const coupon = await Coupon.findById(couponId).session(session || null);
        if (!coupon) {
            throw new AppError('Coupon not found', 404);
        }
        if (coupon.usedCount >= coupon.usageLimit) {
            throw new AppError('Coupon usage limit reached', 400);
        }
        if ((await getUserCouponUsageCount(coupon._id.toString(), userId)) >= (coupon.perUserLimit ?? 1)) {
            throw new AppError('Coupon usage limit reached for this account', 400);
        }
        await CouponUsage.create([{ coupon: coupon._id, user: new Types.ObjectId(userId) }], { session });
        coupon.usedCount += 1;
        await coupon.save({ session });
        await auditLogService.record({
            action: 'coupon.consume',
            actorUserId: userId,
            actorRole: 'customer',
            targetType: 'coupon',
            targetId: coupon._id.toString(),
            targetLabel: coupon.code,
            message: 'Coupon consumed on confirmed order',
            metadata: { code: coupon.code, usedCount: coupon.usedCount }
        });
    },
    restoreCoupon: async (code, userId, session) => {
        if (!code) {
            return;
        }
        const coupon = await Coupon.findOne({ code: normalizeCode(code) }).session(session || null);
        if (!coupon) {
            return;
        }
        const usage = await CouponUsage.findOne({ coupon: coupon._id, user: new Types.ObjectId(userId) })
            .sort({ _id: -1 })
            .session(session || null);
        if (!usage) {
            return;
        }
        await CouponUsage.deleteOne({ _id: usage._id }, { session });
        coupon.usedCount = Math.max(0, coupon.usedCount - 1);
        await coupon.save({ session });
        await auditLogService.record({
            action: 'coupon.restore',
            actorUserId: userId,
            actorRole: 'customer',
            targetType: 'coupon',
            targetId: coupon._id.toString(),
            targetLabel: coupon.code,
            message: 'Coupon usage restored after order cancellation',
            metadata: { code: coupon.code, usedCount: coupon.usedCount }
        });
    }
};
