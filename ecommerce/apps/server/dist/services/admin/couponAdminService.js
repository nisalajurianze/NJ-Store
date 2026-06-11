import { Types } from 'mongoose';
import { Coupon } from '../../models/Coupon.js';
import { Order } from '../../models/Order.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { normalizeEmailAddress } from './adminShared.js';
const normalizeOptionalCouponNumber = (value) => (typeof value === 'number' ? value : undefined);
const normalizeOptionalCouponEmail = (value) => typeof value === 'string' && value.trim() ? normalizeEmailAddress(value) : undefined;
const normalizeCouponObjectIds = (values) => Array.isArray(values) ? values.map((value) => new Types.ObjectId(value)) : undefined;
const normalizeCouponPayload = (payload) => ({
    ...payload,
    ...(payload.code ? { code: payload.code.trim().toUpperCase() } : {}),
    minOrderValue: normalizeOptionalCouponNumber(payload.minOrderValue),
    maxDiscount: normalizeOptionalCouponNumber(payload.maxDiscount),
    restrictToEmail: normalizeOptionalCouponEmail(payload.restrictToEmail),
    appliesToCategories: normalizeCouponObjectIds(payload.appliesToCategories),
    appliesToBrands: normalizeCouponObjectIds(payload.appliesToBrands)
});
export const couponAdminService = {
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
            ['bogo', payload.type && payload.type !== 'bogo' ? null : payload.bogo]
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
    }
};
