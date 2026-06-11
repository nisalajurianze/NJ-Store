import { Types } from 'mongoose';
import { BackInStockSubscription } from '../models/BackInStockSubscription.js';
import { Product } from '../models/Product.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { emailService } from './emailService.js';
const buildVariantLabel = (variant) => {
    const parts = [variant?.color, variant?.storage, variant?.model].filter(Boolean);
    return parts.length ? parts.join(' / ') : undefined;
};
const getProductStock = (product, variantIndex) => {
    if (product.productType === 'bundle') {
        return product.bundleStock ?? 0;
    }
    if (variantIndex !== undefined) {
        return product.variants[variantIndex]?.stock ?? 0;
    }
    return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
};
const normalizeEmail = (value) => value.trim().toLowerCase();
export const backInStockService = {
    subscribe: async (payload) => {
        const product = await Product.findById(payload.productId)
            .select('name slug productType bundleStock variants isActive')
            .lean();
        if (!product || !product.isActive) {
            throw new AppError('Product not found', 404);
        }
        if (payload.variantIndex !== undefined && product.productType !== 'standard') {
            throw new AppError('Variant-specific alerts are only available for standard products.', 400);
        }
        if (payload.variantIndex !== undefined && !product.variants[payload.variantIndex]) {
            throw new AppError('Selected variant was not found.', 404);
        }
        if (getProductStock(product, payload.variantIndex) > 0) {
            throw new AppError('This item is already back in stock.', 400);
        }
        const email = normalizeEmail(payload.email);
        const existing = await BackInStockSubscription.findOne({
            product: product._id,
            email,
            variantIndex: payload.variantIndex
        });
        if (existing) {
            existing.user = payload.userId ? new Types.ObjectId(payload.userId) : existing.user;
            existing.name = payload.name?.trim() || existing.name;
            existing.isActive = true;
            existing.notifiedAt = null;
            await existing.save();
            return {
                id: existing._id.toString(),
                email: existing.email,
                productId: product._id.toString(),
                variantIndex: existing.variantIndex
            };
        }
        const created = await BackInStockSubscription.create({
            product: product._id,
            user: payload.userId ? new Types.ObjectId(payload.userId) : null,
            email,
            name: payload.name?.trim(),
            variantIndex: payload.variantIndex
        });
        return {
            id: created._id.toString(),
            email: created.email,
            productId: product._id.toString(),
            variantIndex: created.variantIndex
        };
    },
    notifyOnStockTransition: async (before, after) => {
        if (!before || !after) {
            return;
        }
        const totalWasOutOfStock = getProductStock(before) <= 0;
        const totalIsInStock = getProductStock(after) > 0;
        const restockedVariantIndexes = after.productType === 'standard'
            ? after.variants
                .map((variant, index) => ({
                index,
                beforeStock: before.variants[index]?.stock ?? 0,
                afterStock: variant.stock
            }))
                .filter((entry) => entry.beforeStock <= 0 && entry.afterStock > 0)
                .map((entry) => entry.index)
            : [];
        if (!totalWasOutOfStock && restockedVariantIndexes.length === 0) {
            return;
        }
        const subscriptions = await BackInStockSubscription.find({
            product: after._id,
            isActive: true
        });
        if (!subscriptions.length) {
            return;
        }
        const productUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/product/${after.slug}`;
        for (const subscription of subscriptions) {
            const shouldNotify = subscription.variantIndex !== undefined
                ? restockedVariantIndexes.includes(subscription.variantIndex)
                : totalWasOutOfStock && totalIsInStock;
            if (!shouldNotify) {
                continue;
            }
            const variant = subscription.variantIndex !== undefined ? after.variants[subscription.variantIndex] : undefined;
            await emailService.sendBackInStock(subscription.name?.trim() || 'there', subscription.email, after.name, productUrl, buildVariantLabel(variant));
            subscription.isActive = false;
            subscription.notifiedAt = new Date();
            await subscription.save();
        }
    }
};
