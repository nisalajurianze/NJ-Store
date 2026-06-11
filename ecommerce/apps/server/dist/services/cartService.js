import { Types } from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { normalizeStoredVariantSelection, resolveRequestedVariantSelection } from '../utils/productVariantSelection.js';
import { serializeCart } from '../utils/serializers.js';
const getCartSelector = (userId, sessionId) => {
    if (userId) {
        return { user: userId };
    }
    if (sessionId) {
        return { sessionId };
    }
    throw new AppError('Cart identifier missing', 400);
};
const populateCart = async (selector) => Cart.findOne(selector).populate({
    path: 'items.product',
    populate: { path: 'category' }
});
const ensureVariantStock = async (productId, variantIndex, quantity) => {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
        throw new AppError('Product is unavailable', 404);
    }
    if (product.productType === 'bundle') {
        if ((product.bundleStock ?? 0) < quantity) {
            throw new AppError('Insufficient stock', 400);
        }
        return undefined;
    }
    const selection = resolveRequestedVariantSelection(product, variantIndex);
    const stock = selection.variant ? selection.variant.stock : product.variants.reduce((sum, entry) => sum + entry.stock, 0);
    if (stock < quantity) {
        throw new AppError('Insufficient stock', 400);
    }
    return selection.variantIndex;
};
const normalizeStoredCartItems = (cart) => {
    const normalizedItems = new Map();
    let didChange = false;
    for (const item of cart.items) {
        const product = item.product;
        if (!product?._id) {
            didChange = true;
            continue;
        }
        const selection = normalizeStoredVariantSelection({
            productType: product.productType,
            variants: Array.isArray(product.variants) ? product.variants : []
        }, item.variantIndex);
        if (!selection) {
            didChange = true;
            continue;
        }
        if ((item.variantIndex ?? null) !== (selection.variantIndex ?? null)) {
            didChange = true;
        }
        const key = `${product._id.toString()}:${selection.variantIndex ?? 'base'}`;
        const existing = normalizedItems.get(key);
        if (existing) {
            existing.quantity += item.quantity;
            didChange = true;
            continue;
        }
        normalizedItems.set(key, {
            product: product._id,
            quantity: item.quantity,
            variantIndex: selection.variantIndex
        });
    }
    if (!didChange) {
        return false;
    }
    cart.set('items', [...normalizedItems.values()]);
    return true;
};
const getOrCreateCart = async (userId, sessionId) => {
    const selector = getCartSelector(userId, sessionId);
    let cart = await Cart.findOne(selector);
    if (!cart) {
        cart = await Cart.create({
            ...(userId ? { user: userId } : { sessionId }),
            items: []
        });
    }
    return cart;
};
export const cartService = {
    getCart: async (userId, sessionId) => {
        const selector = getCartSelector(userId, sessionId);
        const cart = await populateCart(selector);
        if (!cart) {
            const created = await getOrCreateCart(userId, sessionId);
            const populated = await populateCart({ _id: created._id });
            if (!populated) {
                throw new AppError('Unable to load cart', 500);
            }
            return serializeCart(populated.toObject({ virtuals: true }));
        }
        if (normalizeStoredCartItems(cart)) {
            await cart.save();
            const populated = await populateCart({ _id: cart._id });
            if (!populated) {
                throw new AppError('Unable to load cart', 500);
            }
            return serializeCart(populated.toObject({ virtuals: true }));
        }
        return serializeCart(cart.toObject({ virtuals: true }));
    },
    addItem: async (userId, sessionId, productId, quantity, variantIndex) => {
        const resolvedVariantIndex = await ensureVariantStock(productId, variantIndex, quantity);
        const cart = await getOrCreateCart(userId, sessionId);
        const existing = cart.items.find((item) => item.product.toString() === productId &&
            (item.variantIndex ?? null) === (resolvedVariantIndex ?? null));
        if (existing) {
            existing.variantIndex = await ensureVariantStock(productId, resolvedVariantIndex, existing.quantity + quantity);
            existing.quantity += quantity;
        }
        else {
            cart.items.push({
                product: new Types.ObjectId(productId),
                quantity,
                variantIndex: resolvedVariantIndex
            });
        }
        await cart.save();
        const populated = await populateCart({ _id: cart._id });
        if (!populated) {
            throw new AppError('Unable to load cart', 500);
        }
        return serializeCart(populated.toObject({ virtuals: true }));
    },
    updateItem: async (userId, sessionId, itemId, quantity) => {
        const cart = await getOrCreateCart(userId, sessionId);
        const item = cart.items.id(itemId);
        if (!item) {
            throw new AppError('Cart item not found', 404);
        }
        item.variantIndex = await ensureVariantStock(item.product.toString(), item.variantIndex, quantity);
        item.quantity = quantity;
        await cart.save();
        const populated = await populateCart({ _id: cart._id });
        if (!populated) {
            throw new AppError('Unable to load cart', 500);
        }
        return serializeCart(populated.toObject({ virtuals: true }));
    },
    removeItem: async (userId, sessionId, itemId) => {
        const cart = await getOrCreateCart(userId, sessionId);
        const item = cart.items.id(itemId);
        if (!item) {
            throw new AppError('Cart item not found', 404);
        }
        item.deleteOne();
        await cart.save();
        const populated = await populateCart({ _id: cart._id });
        if (!populated) {
            throw new AppError('Unable to load cart', 500);
        }
        return serializeCart(populated.toObject({ virtuals: true }));
    },
    clearCart: async (userId, sessionId) => {
        await Cart.findOneAndUpdate(getCartSelector(userId, sessionId), { items: [] });
    },
    syncCart: async (userId, items, sessionId) => {
        const userCart = await getOrCreateCart(userId);
        for (const item of items) {
            const resolvedVariantIndex = await ensureVariantStock(item.productId, item.variantIndex, item.quantity);
            const existing = userCart.items.find((entry) => entry.product.toString() === item.productId &&
                (entry.variantIndex ?? null) === (resolvedVariantIndex ?? null));
            if (existing) {
                existing.quantity += item.quantity;
            }
            else {
                userCart.items.push({
                    product: new Types.ObjectId(item.productId),
                    quantity: item.quantity,
                    variantIndex: resolvedVariantIndex
                });
            }
        }
        await userCart.save();
        if (sessionId) {
            await Cart.findOneAndDelete({ sessionId });
        }
        const populated = await populateCart({ _id: userCart._id });
        if (!populated) {
            throw new AppError('Unable to load cart', 500);
        }
        return serializeCart(populated.toObject({ virtuals: true }));
    }
};
