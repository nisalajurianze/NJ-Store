import dayjs from 'dayjs';
import mongoose, { Types } from 'mongoose';
import { formatDate, resolveConfiguredShipping } from '@njstore/utils';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { createPagination } from '../utils/pagination.js';
import { createRandomToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { resolveRequestedVariantSelection } from '../utils/productVariantSelection.js';
import { buildSafeRegex } from '../utils/regex.js';
import { auditLogService } from './auditLogService.js';
import { backInStockService } from './backInStockService.js';
import { bundleService } from './bundleService.js';
import { cacheNamespaces, cacheService, invalidateInventoryDerivedCaches } from './cacheService.js';
import { couponService } from './couponService.js';
import { emailService } from './emailService.js';
import { inventoryBroadcastService } from './inventoryBroadcastService.js';
import { generateOrderPdfBuffer } from './pdfService.js';
import { siteConfigService } from './siteConfigService.js';
import { smsService } from './smsService.js';
import { notificationService } from './notificationService.js';
import { removeAsset, uploadBuffer, uploadGeneratedBuffer } from './uploadService.js';
import { serializeAdminOrder, serializeOrder } from '../utils/serializers.js';
const isEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const resolveLowStockAlertEmail = () => {
    const candidates = [env.SUPPORT_EMAIL, env.EMAIL_FROM, env.SMTP_USER];
    return candidates.find((candidate) => candidate && isEmailAddress(candidate)) ?? null;
};
const sendLowStockAlertSafely = async (productName, sku, stock) => {
    const email = resolveLowStockAlertEmail();
    if (!email) {
        logger.warn(`order.low_stock_email_skipped product=${productName} sku=${sku} reason=no_valid_recipient`);
        return;
    }
    try {
        await emailService.sendLowStockAlert(email, productName, sku, stock);
    }
    catch (error) {
        logger.warn(`order.low_stock_email_failed product=${productName} sku=${sku} reason=${error instanceof Error ? error.message : 'unknown'}`);
    }
};
const documentCounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0, min: 0 }
}, {
    collection: 'documentCounters',
    timestamps: true,
    versionKey: false
});
const DocumentCounter = mongoose.models.DocumentCounter ??
    mongoose.model('DocumentCounter', documentCounterSchema);
const reserveDocumentNumber = async (prefix, session) => {
    const dateKey = dayjs().format('YYYYMMDD');
    const counterId = `${prefix}-${dateKey}`;
    const counter = await DocumentCounter.findByIdAndUpdate(counterId, {
        $inc: { sequence: 1 },
        $setOnInsert: { _id: counterId }
    }, {
        new: true,
        session,
        upsert: true,
        setDefaultsOnInsert: true
    }).select('sequence');
    if (!counter) {
        throw new AppError('Unable to generate document number', 500);
    }
    return `${prefix}-${dateKey}-${counter.sequence.toString().padStart(6, '0')}`;
};
const escapeCsv = (value) => `"${value.replace(/"/g, '""')}"`;
const addBusinessDays = (startDate, range) => {
    const maximum = Number(range.split('-').at(-1) ?? '3');
    let current = dayjs(startDate);
    let added = 0;
    while (added < maximum) {
        current = current.add(1, 'day');
        if (![0, 6].includes(current.day())) {
            added += 1;
        }
    }
    return current.toDate();
};
const getBaseUrl = (baseUrl) => baseUrl.replace(/\/$/, '');
const invalidateAnalyticsCache = async () => {
    await cacheService.bumpNamespace(cacheNamespaces.analytics);
};
const resolveShipping = async (address, subtotal) => {
    const config = await siteConfigService.getOrCreateDocument();
    if (!address) {
        return { fee: 0, days: '0', estimatedDeliveryDate: undefined };
    }
    const shipping = resolveConfiguredShipping({
        city: address.city,
        subtotal,
        freeShippingThreshold: config.freeShippingThreshold,
        shippingRates: config.shippingRates
    });
    return {
        fee: shipping.fee,
        days: shipping.days,
        estimatedDeliveryDate: addBusinessDays(new Date(), shipping.days)
    };
};
const resolveAddress = async (userId, input) => {
    if (input.type === 'pickup') {
        return undefined;
    }
    if (input.shippingAddress) {
        return input.shippingAddress;
    }
    if (!input.addressId) {
        throw new AppError('Shipping address is required', 400);
    }
    const user = await User.findById(userId);
    const address = user?.addresses.find((entry) => entry._id?.toString() === input.addressId);
    if (!address) {
        throw new AppError('Address not found', 404);
    }
    return {
        _id: address._id?.toString(),
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        district: address.district,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault
    };
};
const resolveQuotationFulfilment = async (userId, order, payload) => {
    const effectiveType = payload.type ?? (order.fulfilmentConfigured ?? true ? order.type : undefined);
    if (!effectiveType) {
        throw new AppError('Choose delivery or store pickup before confirming the quotation', 400);
    }
    const shippingAddress = effectiveType === 'delivery'
        ? await resolveAddress(userId, {
            items: [],
            type: effectiveType,
            addressId: payload.addressId,
            shippingAddress: payload.shippingAddress ??
                (!payload.addressId && order.type === 'delivery' ? order.shippingAddress : undefined)
        })
        : undefined;
    return {
        type: effectiveType,
        shippingAddress,
        pickupSlot: effectiveType === 'pickup'
            ? payload.pickupSlot?.trim() || (order.type === 'pickup' ? order.pickupSlot : undefined)
            : undefined,
        deliveryNotes: effectiveType === 'delivery'
            ? payload.deliveryNotes?.trim() || (order.type === 'delivery' ? order.deliveryNotes : undefined)
            : undefined
    };
};
const buildOrderItems = async (items, session) => {
    if (!items.length) {
        throw new AppError('Order requires at least one item', 400);
    }
    const products = await Product.find({
        _id: { $in: items.map((item) => new Types.ObjectId(item.productId)) },
        isActive: true
    }).session(session ?? null);
    return Promise.all(items.map(async (item) => {
        const product = products.find((entry) => entry._id.toString() === item.productId);
        if (!product) {
            throw new AppError('One or more products are unavailable', 404);
        }
        if (product.productType === 'bundle') {
            const availableStock = product.bundleStock ?? 0;
            if (availableStock < item.quantity) {
                throw new AppError(`Insufficient stock for ${product.name}`, 400);
            }
            return {
                product: product._id,
                productId: product._id.toString(),
                quantity: item.quantity,
                name: product.name,
                slug: product.slug,
                image: product.images[0],
                price: product.price,
                sku: product.sku,
                categoryId: product.category?.toString() ?? null,
                brandId: product.brand?.toString() ?? null,
                bundleItems: await bundleService.buildBundleOrderItems(product)
            };
        }
        const selection = resolveRequestedVariantSelection(product, item.variantIndex);
        const availableStock = selection.variant ? selection.variant.stock : product.variants.reduce((sum, entry) => sum + entry.stock, 0);
        if (availableStock < item.quantity) {
            throw new AppError(`Insufficient stock for ${product.name}`, 400);
        }
        return {
            product: product._id,
            productId: product._id.toString(),
            quantity: item.quantity,
            variantIndex: selection.variantIndex,
            name: product.name,
            slug: product.slug,
            image: product.images[0],
            price: selection.variant?.price ?? product.price,
            variantLabel: [
                selection.variant?.color,
                selection.variant?.storage,
                selection.variant?.model,
                ...(selection.variant?.attributes ?? []).map((attribute) => `${attribute.name}: ${attribute.value}`)
            ]
                .filter(Boolean)
                .join(' / '),
            sku: selection.variant?.sku ?? product.sku,
            categoryId: product.category?.toString() ?? null,
            brandId: product.brand?.toString() ?? null
        };
    }));
};
const getCouponOutcome = async (userId, userEmail, couponCode, subtotal, shippingFee, items) => {
    return couponService.resolveBestDiscount({
        userId,
        userEmail,
        code: couponCode,
        subtotal,
        shippingFee,
        items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantIndex: item.variantIndex
        }))
    });
};
const resolveLoyaltyRedemption = (requestedPoints, availablePoints, payableAmount) => {
    const requested = Math.max(0, Math.trunc(Number(requestedPoints ?? 0)));
    const available = Math.max(0, Math.trunc(Number(availablePoints ?? 0)));
    const payable = Math.floor(Math.max(payableAmount, 0));
    if (requested <= 0 || payable <= 0) {
        return { points: 0, discount: 0 };
    }
    if (requested > available) {
        throw new AppError(`You only have ${available} loyalty points available`, 400);
    }
    const points = Math.min(requested, payable);
    return {
        points,
        discount: points
    };
};
const redeemLoyaltyPoints = async (userId, orderId, orderNumber, points, session) => {
    if (points <= 0) {
        return;
    }
    const user = await User.findOneAndUpdate({ _id: userId, loyaltyPoints: { $gte: points } }, { $inc: { loyaltyPoints: -points } }, { new: true, session });
    if (!user) {
        throw new AppError('You do not have enough loyalty points to confirm this order', 400);
    }
    await new LoyaltyTransaction({
        user: userId,
        order: orderId,
        type: 'redeemed',
        points: -points,
        description: `Redeemed for order ${orderNumber}`
    }).save({ session });
};
const restoreLoyaltyRedemption = async (order, userId, session) => {
    const points = Math.max(0, Math.trunc(Number(order.loyaltyPointsRedeemed ?? 0)));
    if (points <= 0) {
        return;
    }
    await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: points } }, { session });
    await new LoyaltyTransaction({
        user: new Types.ObjectId(userId),
        order: order._id,
        type: 'adjusted',
        points,
        description: `Returned loyalty points for cancelled order ${order.orderNumber}`
    }).save({ session });
};
const calculateTaxSnapshot = (taxSettings, taxableAmount) => {
    const taxRate = taxSettings?.enabled ? Math.max(taxSettings.rate ?? 0, 0) : 0;
    const taxLabel = taxSettings?.label?.trim() || 'VAT';
    const taxAmount = taxRate > 0 ? Math.round(Math.max(taxableAmount, 0) * (taxRate / 100)) : 0;
    return {
        taxAmount,
        taxLabel,
        taxRate
    };
};
const isNotificationChannelEnabled = (settings, key, channel) => settings?.[key]?.[channel] ?? (channel === 'emailEnabled');
const resolveCustomerNotificationPhone = (shippingAddress, userPhone) => shippingAddress?.phone?.trim() || userPhone?.trim() || null;
const collectAffectedProductIdsFromOrderItems = (items) => items.flatMap((item) => {
    const productId = resolveStoredOrderItemProductId(item).trim();
    const bundleProductIds = item.bundleItems?.flatMap((bundleItem) => {
        if (!bundleItem.product) {
            return [];
        }
        const normalizedProductId = bundleItem.product.toString().trim();
        return normalizedProductId ? [normalizedProductId] : [];
    }) ?? [];
    return productId ? [productId, ...bundleProductIds] : bundleProductIds;
});
const orderStatusLabel = (status) => ({
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
})[status];
const captureProductStockSnapshot = async (productId, session) => {
    const product = await Product.findById(productId)
        .select('name slug productType bundleStock variants')
        .session(session || null);
    if (!product) {
        return null;
    }
    return {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        productType: product.productType,
        bundleStock: product.bundleStock,
        variants: product.variants.map((variant) => ({
            color: variant.color,
            storage: variant.storage,
            model: variant.model,
            attributes: variant.attributes,
            stock: variant.stock,
            sku: variant.sku
        }))
    };
};
const decrementInventory = async (items, session) => {
    const config = await siteConfigService.getOrCreateDocument();
    const affectedProductIds = new Set();
    for (const item of items) {
        affectedProductIds.add(item.productId);
        if (item.bundleItems?.length) {
            const bundle = await Product.findByIdAndUpdate(item.productId, { $inc: { soldCount: item.quantity } }, { new: true, session });
            if (!bundle) {
                throw new AppError(`Bundle not found during inventory update for ${item.name}`, 404);
            }
            for (const bundleItem of item.bundleItems) {
                const variantIndex = bundleItem.variantIndex ?? 0;
                const requiredQuantity = bundleItem.quantity * item.quantity;
                const product = await Product.findOneAndUpdate({
                    _id: bundleItem.product,
                    [`variants.${variantIndex}.stock`]: { $gte: requiredQuantity }
                }, {
                    $inc: {
                        [`variants.${variantIndex}.stock`]: -requiredQuantity,
                        soldCount: requiredQuantity
                    }
                }, { new: true, session });
                if (!product) {
                    throw new AppError(`Insufficient stock for ${bundleItem.name}`, 400);
                }
                affectedProductIds.add(bundleItem.product.toString());
                const variant = product.variants[variantIndex];
                if (variant.stock < config.lowStockThreshold) {
                    if (isNotificationChannelEnabled(config.notificationSettings, 'lowStockAlert', 'emailEnabled')) {
                        void sendLowStockAlertSafely(product.name, variant.sku, variant.stock);
                    }
                    if (isNotificationChannelEnabled(config.notificationSettings, 'lowStockAlert', 'smsEnabled')) {
                        await smsService.sendLowStockAlert(config.supportPhoneNumber, product.name, variant.sku, variant.stock);
                    }
                }
            }
            continue;
        }
        if (item.variantIndex !== undefined) {
            const product = await Product.findOneAndUpdate({
                _id: item.productId,
                [`variants.${item.variantIndex}.stock`]: { $gte: item.quantity }
            }, {
                $inc: {
                    [`variants.${item.variantIndex}.stock`]: -item.quantity,
                    soldCount: item.quantity
                }
            }, { new: true, session });
            if (!product) {
                throw new AppError(`Insufficient stock for ${item.name}`, 400);
            }
            const variant = product.variants[item.variantIndex];
            if (variant.stock < config.lowStockThreshold) {
                if (isNotificationChannelEnabled(config.notificationSettings, 'lowStockAlert', 'emailEnabled')) {
                    void sendLowStockAlertSafely(product.name, variant.sku, variant.stock);
                }
                if (isNotificationChannelEnabled(config.notificationSettings, 'lowStockAlert', 'smsEnabled')) {
                    await smsService.sendLowStockAlert(config.supportPhoneNumber, product.name, variant.sku, variant.stock);
                }
            }
        }
        else {
            const product = await Product.findOneAndUpdate({ _id: item.productId }, { $inc: { soldCount: item.quantity } }, { new: true, session });
            if (!product) {
                throw new AppError('Product not found during inventory update', 404);
            }
        }
    }
    await bundleService.recalculateBundleStocksForProductIds([...affectedProductIds], session);
    return [...affectedProductIds];
};
const restoreInventory = async (items, session) => {
    const affectedProductIds = new Set();
    const stockTransitions = [];
    for (const item of items) {
        const storedProductId = resolveStoredOrderItemProductId(item);
        affectedProductIds.add(storedProductId);
        if (item.bundleItems?.length) {
            const bundle = await Product.findByIdAndUpdate(storedProductId, { $inc: { soldCount: -item.quantity } }, { new: true, session });
            if (!bundle) {
                throw new AppError(`Bundle not found during inventory restore for ${item.name}`, 404);
            }
            for (const bundleItem of item.bundleItems) {
                const variantIndex = bundleItem.variantIndex ?? 0;
                const restoreQuantity = bundleItem.quantity * item.quantity;
                const before = await captureProductStockSnapshot(bundleItem.product, session);
                const product = await Product.findByIdAndUpdate(bundleItem.product, {
                    $inc: {
                        [`variants.${variantIndex}.stock`]: restoreQuantity,
                        soldCount: -restoreQuantity
                    }
                }, { new: true, session });
                if (!product) {
                    throw new AppError(`Product not found during inventory restore for ${bundleItem.name}`, 404);
                }
                const after = await captureProductStockSnapshot(bundleItem.product, session);
                if (before && after) {
                    stockTransitions.push({ before, after });
                }
                affectedProductIds.add(bundleItem.product.toString());
            }
            continue;
        }
        if (item.variantIndex !== undefined) {
            const before = await captureProductStockSnapshot(storedProductId, session);
            const product = await Product.findByIdAndUpdate(storedProductId, {
                $inc: {
                    [`variants.${item.variantIndex}.stock`]: item.quantity,
                    soldCount: -item.quantity
                }
            }, { new: true, session });
            if (!product) {
                throw new AppError(`Product not found during inventory restore for ${item.name}`, 404);
            }
            const after = await captureProductStockSnapshot(storedProductId, session);
            if (before && after) {
                stockTransitions.push({ before, after });
            }
        }
        else {
            const product = await Product.findByIdAndUpdate(storedProductId, { $inc: { soldCount: -item.quantity } }, { new: true, session });
            if (!product) {
                throw new AppError(`Product not found during inventory restore for ${item.name}`, 404);
            }
        }
    }
    const bundleTransitions = await bundleService.recalculateBundleStocksForProductIds([...affectedProductIds], session);
    return [...stockTransitions, ...bundleTransitions];
};
const restoreCommittedOrderEffects = async (order, userId, session) => {
    if (order.isQuotation) {
        return [];
    }
    const inventoryTransitions = await restoreInventory(order.items, session);
    await couponService.restoreCoupon(order.couponCode, userId, session);
    await restoreLoyaltyRedemption(order, userId, session);
    return inventoryTransitions;
};
const ensureOrderOwnership = (orderUserId, userId) => {
    if (userId && orderUserId.toString() !== userId) {
        throw new AppError('Order not found', 404);
    }
};
function resolveStoredOrderItemProductId(item) {
    if (item.productId) {
        return item.productId;
    }
    if (item.product) {
        return item.product.toString();
    }
    throw new AppError('Order item product is missing.', 500);
}
const getReceiptTimestamp = (order) => order.updatedAt ?? order.createdAt ?? new Date();
const getReceiptSnapshot = (order) => {
    if (order.receipts?.length) {
        return order.receipts;
    }
    if (!order.receipt) {
        return [];
    }
    return [
        {
            url: order.receipt.url,
            publicId: order.receipt.publicId,
            alt: order.receipt.alt,
            createdAt: getReceiptTimestamp(order)
        }
    ];
};
const migrateLegacyReceiptIfNeeded = async (order, session) => {
    if ((order.receipts?.length ?? 0) > 0 || !order.receipt) {
        return;
    }
    order.set('receipts', [
        {
            url: order.receipt.url,
            publicId: order.receipt.publicId,
            alt: order.receipt.alt,
            createdAt: getReceiptTimestamp(order)
        }
    ]);
    order.receipt = undefined;
    if (session) {
        await order.save({ session });
        return;
    }
    await order.save();
};
const assertEditableReceiptState = (order) => {
    if (order.status === 'cancelled') {
        throw new AppError('Cancelled orders are read-only', 400);
    }
    if (order.isQuotation) {
        throw new AppError('Confirm the quotation before managing receipts', 400);
    }
    if (order.paymentStatus === 'paid') {
        throw new AppError('Receipts are locked after payment approval', 400);
    }
};
const adminAllowedTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
};
const normalizeComparableText = (value) => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
const areEquivalentAddresses = (left, right) => {
    if (!left && !right) {
        return true;
    }
    if (!left || !right) {
        return false;
    }
    return [
        left.label,
        left.fullName,
        left.phone,
        left.line1,
        left.line2,
        left.city,
        left.district,
        left.postalCode,
        left.country
    ].every((value, index) => normalizeComparableText(value) ===
        normalizeComparableText([right.label, right.fullName, right.phone, right.line1, right.line2, right.city, right.district, right.postalCode, right.country][index]));
};
const combineUniqueText = (...values) => {
    const unique = values
        .map((value) => value?.trim())
        .filter((value) => Boolean(value))
        .filter((value, index, items) => items.indexOf(value) === index);
    return unique.length ? unique.join(' | ') : undefined;
};
const resolveManualOrderCustomer = async (payload, session) => {
    const email = payload.customerEmail.trim().toLowerCase();
    const customerById = payload.customerId ? await User.findById(payload.customerId).session(session) : null;
    const existingCustomer = customerById ?? await User.findOne({ email }).session(session);
    if (existingCustomer) {
        let changed = false;
        if (payload.customerPhone?.trim() && !existingCustomer.phone) {
            existingCustomer.phone = payload.customerPhone.trim();
            changed = true;
        }
        if (changed) {
            await existingCustomer.save({ session });
        }
        return existingCustomer;
    }
    const customer = new User({
        name: payload.customerName.trim(),
        email,
        phone: payload.customerPhone?.trim() || undefined,
        password: createRandomToken(),
        role: 'customer',
        authProvider: 'local',
        language: 'en',
        isEmailVerified: true,
        isActive: true
    });
    await customer.save({ session });
    return customer;
};
export const orderService = {
    adminCreateOrder: async (payload, actorName, baseUrl) => {
        const session = await mongoose.startSession();
        let orderToReturn;
        let customerForDocument = null;
        let shouldGenerateInvoice = false;
        let affectedProductIds = [];
        try {
            await session.withTransaction(async () => {
                const customer = await resolveManualOrderCustomer(payload, session);
                const orderType = payload.type ?? 'delivery';
                const shippingAddress = orderType === 'delivery' ? payload.shippingAddress : undefined;
                if (orderType === 'delivery' && !shippingAddress) {
                    throw new AppError('Shipping address is required', 400);
                }
                const items = await buildOrderItems(payload.items, session);
                const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const resolvedShipping = orderType === 'delivery'
                    ? await resolveShipping(shippingAddress, subtotal)
                    : { fee: 0, days: '0', estimatedDeliveryDate: undefined };
                const shippingFee = payload.shippingFee ?? resolvedShipping.fee;
                const discount = Math.min(payload.discount ?? 0, subtotal + shippingFee);
                const taxableAmount = Math.max(subtotal + shippingFee - discount, 0);
                const config = await siteConfigService.getOrCreateDocument();
                const taxSnapshot = payload.taxAmount !== undefined
                    ? {
                        taxAmount: payload.taxAmount,
                        taxLabel: payload.taxLabel?.trim() || config.taxSettings?.label || 'VAT',
                        taxRate: payload.taxRate ?? config.taxSettings?.rate ?? 0
                    }
                    : calculateTaxSnapshot(config.taxSettings, taxableAmount);
                const paymentStatus = payload.paymentStatus ?? 'unpaid';
                const status = payload.status ?? (paymentStatus === 'paid' ? 'processing' : 'pending');
                if (status === 'shipped' && !payload.trackingNumber?.trim()) {
                    throw new AppError('Tracking number is required before marking shipped', 400);
                }
                let assignedTo;
                if (payload.assignedToId) {
                    const assignedAdmin = await User.findById(payload.assignedToId).session(session);
                    if (!assignedAdmin || !['admin', 'staff'].includes(assignedAdmin.role) || assignedAdmin.isActive === false) {
                        throw new AppError('Assigned staff member must be an active admin or staff user', 400);
                    }
                    assignedTo = assignedAdmin._id;
                }
                affectedProductIds = await decrementInventory(items, session);
                const total = Math.max(taxableAmount + taxSnapshot.taxAmount, 0);
                const orderNumber = await reserveDocumentNumber('ORD', session);
                const paymentRecordedAt = paymentStatus === 'paid' ? new Date() : undefined;
                const timelineNotes = [
                    'Manual order created by admin',
                    status !== 'pending' ? `Status set to ${status}` : undefined,
                    paymentStatus === 'paid' ? 'Payment recorded as paid' : undefined
                ].filter((note) => Boolean(note));
                const order = new Order({
                    user: customer._id,
                    orderNumber,
                    isQuotation: false,
                    fulfilmentConfigured: true,
                    type: orderType,
                    paymentMethod: payload.paymentMethod ?? 'bank_transfer',
                    status,
                    paymentStatus,
                    paidAt: paymentRecordedAt,
                    subtotal,
                    shippingFee,
                    discount,
                    taxAmount: taxSnapshot.taxAmount,
                    taxLabel: taxSnapshot.taxLabel,
                    taxRate: taxSnapshot.taxRate,
                    total,
                    shippingAddress,
                    pickupSlot: orderType === 'pickup' ? payload.pickupSlot?.trim() || undefined : undefined,
                    notes: payload.notes?.trim() || undefined,
                    deliveryNotes: orderType === 'delivery' ? payload.deliveryNotes?.trim() || undefined : undefined,
                    items,
                    trackingNumber: payload.trackingNumber?.trim() || undefined,
                    assignedTo,
                    estimatedDeliveryDays: orderType === 'delivery' ? resolvedShipping.days : '0',
                    estimatedDeliveryDate: resolvedShipping.estimatedDeliveryDate,
                    loyaltyPointsAwarded: Math.floor(Math.max(taxableAmount, 0) / config.loyaltyPointsRate),
                    loyaltyPointsGranted: status === 'delivered' && paymentStatus === 'paid',
                    timeline: [
                        {
                            status,
                            note: timelineNotes.join(' • '),
                            actor: actorName,
                            createdAt: new Date()
                        }
                    ]
                });
                if (order.loyaltyPointsGranted && order.loyaltyPointsAwarded > 0) {
                    customer.loyaltyPoints += order.loyaltyPointsAwarded;
                    await customer.save({ session });
                    await new LoyaltyTransaction({
                        user: customer._id,
                        order: order._id,
                        type: 'earned',
                        points: order.loyaltyPointsAwarded,
                        description: `Delivered order ${order.orderNumber}`
                    }).save({ session });
                }
                await order.save({ session });
                orderToReturn = order;
                customerForDocument = customer;
                shouldGenerateInvoice = paymentStatus === 'paid';
            });
        }
        finally {
            await session.endSession();
        }
        if (!orderToReturn || !customerForDocument) {
            throw new AppError('Transaction failed', 500);
        }
        if (shouldGenerateInvoice) {
            try {
                const siteConfig = await siteConfigService.getConfig();
                const invoiceBuffer = await generateOrderPdfBuffer(serializeOrder(orderToReturn.toObject()), siteConfig, 'INVOICE', customerForDocument.email, customerForDocument.name);
                orderToReturn.invoicePdf = await uploadGeneratedBuffer({
                    buffer: invoiceBuffer,
                    fileName: `${orderToReturn.orderNumber}.pdf`,
                    mimeType: 'application/pdf',
                    folder: 'documents/invoices',
                    baseUrl: getBaseUrl(baseUrl),
                    alt: `${orderToReturn.orderNumber} invoice`
                });
                await orderToReturn.save();
            }
            catch (error) {
                logger.warn(`order.manual_invoice_generation_failed order=${orderToReturn._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
            }
        }
        try {
            await notificationService.create({
                userId: customerForDocument._id.toString(),
                type: 'system',
                title: 'Order created',
                body: `Order ${orderToReturn.orderNumber} was created by support.`,
                link: `/dashboard/orders/${orderToReturn._id.toString()}`
            });
        }
        catch (error) {
            logger.warn(`order.manual_notification_failed order=${orderToReturn._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
        }
        logger.info(`order.admin_created order=${orderToReturn._id.toString()} actor=${actorName} total=${orderToReturn.total}`);
        await invalidateInventoryDerivedCaches();
        await invalidateAnalyticsCache();
        await inventoryBroadcastService.broadcastProductStockUpdates(affectedProductIds);
        return serializeOrder(orderToReturn.toObject());
    },
    createQuotation: async (userId, payload, baseUrl) => {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        const fulfilmentConfigured = Boolean(payload.type);
        const shippingAddress = fulfilmentConfigured ? await resolveAddress(userId, payload) : undefined;
        const items = await buildOrderItems(payload.items);
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shipping = payload.type === 'delivery'
            ? await resolveShipping(shippingAddress, subtotal)
            : { fee: 0, days: '0', estimatedDeliveryDate: undefined };
        const config = await siteConfigService.getOrCreateDocument();
        const requestedPaymentMethod = payload.paymentMethod ?? 'bank_transfer';
        if (requestedPaymentMethod === 'cash_on_delivery') {
            if (config.cashOnDeliveryEnabled === false) {
                throw new AppError('Cash on Delivery is currently disabled', 400);
            }
            if (fulfilmentConfigured && payload.type !== 'delivery') {
                throw new AppError('Cash on Delivery is available only for delivery orders', 400);
            }
        }
        const couponResult = await getCouponOutcome(userId, user.email, payload.couponCode, subtotal, shipping.fee, items);
        const loyaltyRedemption = resolveLoyaltyRedemption(payload.loyaltyPointsToRedeem, user.loyaltyPoints, couponResult.finalTotal);
        const taxableAmount = Math.max(couponResult.finalTotal - loyaltyRedemption.discount, 0);
        const taxSnapshot = calculateTaxSnapshot(config.taxSettings, taxableAmount);
        const quotationToken = createRandomToken();
        const quotationNumber = await reserveDocumentNumber('QTN');
        const order = await Order.create({
            user: user._id,
            orderNumber: quotationNumber,
            quotationNumber,
            quotationToken,
            quotationExpiry: dayjs().add(config.quotationExpiryDays, 'day').toDate(),
            isQuotation: true,
            fulfilmentConfigured,
            type: payload.type ?? 'pickup',
            paymentMethod: requestedPaymentMethod,
            status: 'pending',
            paymentStatus: 'unpaid',
            subtotal,
            shippingFee: shipping.fee,
            discount: couponResult.discount,
            taxAmount: taxSnapshot.taxAmount,
            taxLabel: taxSnapshot.taxLabel,
            taxRate: taxSnapshot.taxRate,
            total: taxableAmount + taxSnapshot.taxAmount,
            shippingAddress,
            pickupSlot: payload.type === 'pickup' ? payload.pickupSlot : undefined,
            notes: payload.notes,
            deliveryNotes: payload.type === 'delivery' ? payload.deliveryNotes : undefined,
            couponCode: couponResult.code ?? payload.couponCode?.trim().toUpperCase(),
            items,
            estimatedDeliveryDays: payload.type === 'delivery' ? shipping.days : undefined,
            estimatedDeliveryDate: shipping.estimatedDeliveryDate,
            loyaltyPointsAwarded: Math.floor(taxableAmount / config.loyaltyPointsRate),
            loyaltyPointsRedeemed: loyaltyRedemption.points,
            loyaltyDiscount: loyaltyRedemption.discount,
            timeline: [
                {
                    status: 'pending',
                    note: 'Quotation created',
                    actor: user.name,
                    createdAt: new Date()
                }
            ]
        });
        let quotationPdfReady = false;
        try {
            const siteConfig = await siteConfigService.getConfig();
            const serialized = serializeOrder(order.toObject());
            const pdfBuffer = await generateOrderPdfBuffer(serialized, siteConfig, 'QUOTATION', user.email, user.name);
            const pdfAsset = await uploadGeneratedBuffer({
                buffer: pdfBuffer,
                fileName: `${quotationNumber}.pdf`,
                mimeType: 'application/pdf',
                folder: 'documents/quotations',
                baseUrl: getBaseUrl(baseUrl),
                alt: `${quotationNumber} quotation`
            });
            order.quotationPdf = pdfAsset;
            await order.save();
            quotationPdfReady = true;
        }
        catch (error) {
            logger.warn(`order.quotation_document_failed order=${order._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
        }
        logger.info(`order.quotation.created order=${order._id.toString()} user=${userId} total=${order.total}`);
        const quotationUrl = `${env.CLIENT_URL}/quotation/confirm?token=${quotationToken}`;
        if (isNotificationChannelEnabled(config.notificationSettings, 'quotationReady', 'emailEnabled') && quotationPdfReady && order.quotationPdf?.url) {
            void Promise.resolve(emailService.sendQuotation(user.name, user.email, quotationUrl, order.quotationPdf.url, formatDate(order.quotationExpiry ?? new Date()))).catch((error) => {
                logger.warn(`order.quotation_email_failed order=${order._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
            });
        }
        if (isNotificationChannelEnabled(config.notificationSettings, 'quotationReady', 'smsEnabled')) {
            const customerPhone = resolveCustomerNotificationPhone(shippingAddress, user.phone);
            if (customerPhone) {
                void Promise.resolve(smsService.sendQuotationReady(customerPhone, quotationNumber, quotationUrl)).catch((error) => {
                    logger.warn(`order.quotation_sms_failed order=${order._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
                });
            }
        }
        return serializeOrder(order.toObject());
    },
    getQuotationByToken: async (token, userId) => {
        const order = await Order.findOne({
            quotationToken: token,
            isQuotation: true,
            status: 'pending',
            quotationExpiry: { $gt: new Date() }
        });
        if (!order) {
            throw new AppError('Quotation not found or expired', 404);
        }
        ensureOrderOwnership(order.user, userId);
        return serializeOrder(order.toObject());
    },
    confirmQuotation: async (token, userId, payload = {}) => {
        const session = await mongoose.startSession();
        let orderToReturn;
        let affectedProductIds = [];
        try {
            await session.withTransaction(async () => {
                const order = await Order.findOne({
                    quotationToken: token,
                    isQuotation: true,
                    status: 'pending',
                    quotationExpiry: { $gt: new Date() }
                }).session(session);
                if (!order) {
                    throw new AppError('Quotation not found or expired', 404);
                }
                ensureOrderOwnership(order.user, userId);
                const user = await User.findById(order.user).session(session);
                if (!user) {
                    throw new AppError('User not found', 404);
                }
                if (!user.isEmailVerified) {
                    throw new AppError('Verify your email in profile before confirming the order', 403);
                }
                const recalculatedItems = await buildOrderItems(order.items.map((item) => ({
                    productId: item.product.toString(),
                    quantity: item.quantity,
                    variantIndex: item.variantIndex
                })));
                const subtotal = recalculatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const fulfilment = await resolveQuotationFulfilment(user._id.toString(), {
                    type: order.type,
                    shippingAddress: order.shippingAddress,
                    pickupSlot: order.pickupSlot,
                    deliveryNotes: order.deliveryNotes,
                    fulfilmentConfigured: order.fulfilmentConfigured
                }, payload);
                const shipping = fulfilment.type === 'delivery'
                    ? await resolveShipping(fulfilment.shippingAddress, subtotal)
                    : { fee: 0, days: '0', estimatedDeliveryDate: undefined };
                const couponResult = await getCouponOutcome(user._id.toString(), user.email, order.couponCode, subtotal, shipping.fee, recalculatedItems);
                const config = await siteConfigService.getOrCreateDocument();
                const requestedPaymentMethod = payload.paymentMethod ?? order.paymentMethod;
                if (requestedPaymentMethod === 'cash_on_delivery') {
                    if (config.cashOnDeliveryEnabled === false) {
                        throw new AppError('Cash on Delivery is currently disabled', 400);
                    }
                    if (fulfilment.type !== 'delivery') {
                        throw new AppError('Cash on Delivery is available only for delivery orders', 400);
                    }
                }
                const loyaltyRedemption = resolveLoyaltyRedemption(payload.loyaltyPointsToRedeem ?? order.loyaltyPointsRedeemed, user.loyaltyPoints, couponResult.finalTotal);
                const taxableAmount = Math.max(couponResult.finalTotal - loyaltyRedemption.discount, 0);
                const taxSnapshot = calculateTaxSnapshot(config.taxSettings, taxableAmount);
                affectedProductIds = await decrementInventory(recalculatedItems, session);
                if (couponResult.couponId) {
                    await couponService.consumeCoupon(couponResult.couponId, user._id.toString(), session);
                }
                order.isQuotation = false;
                order.fulfilmentConfigured = true;
                order.orderNumber = await reserveDocumentNumber('ORD', session);
                order.quotationToken = undefined;
                order.type = fulfilment.type;
                order.paymentMethod = requestedPaymentMethod;
                order.subtotal = subtotal;
                order.shippingFee = shipping.fee;
                order.discount = couponResult.discount;
                order.couponCode = couponResult.code ?? order.couponCode;
                order.taxAmount = taxSnapshot.taxAmount;
                order.taxLabel = taxSnapshot.taxLabel;
                order.taxRate = taxSnapshot.taxRate;
                order.total = taxableAmount + taxSnapshot.taxAmount;
                order.loyaltyPointsAwarded = Math.floor(taxableAmount / config.loyaltyPointsRate);
                order.loyaltyPointsRedeemed = loyaltyRedemption.points;
                order.loyaltyDiscount = loyaltyRedemption.discount;
                order.set('shippingAddress', fulfilment.shippingAddress);
                order.pickupSlot = fulfilment.pickupSlot;
                order.deliveryNotes = fulfilment.deliveryNotes;
                order.set('items', recalculatedItems);
                order.status = 'pending';
                order.paymentStatus = 'unpaid';
                order.estimatedDeliveryDays = fulfilment.type === 'delivery' ? shipping.days : '0';
                order.estimatedDeliveryDate = shipping.estimatedDeliveryDate;
                order.timeline.push({
                    status: 'pending',
                    note: 'Quotation confirmed by customer',
                    actor: user.name,
                    createdAt: new Date()
                });
                await redeemLoyaltyPoints(user._id, order._id, order.orderNumber, loyaltyRedemption.points, session);
                await order.save({ session });
                orderToReturn = order;
            });
        }
        finally {
            await session.endSession();
        }
        if (!orderToReturn) {
            throw new AppError('Transaction failed', 500);
        }
        const user = await User.findById(orderToReturn.user);
        if (!user)
            throw new AppError('User not found', 404);
        logger.info(`order.quotation.confirmed order=${orderToReturn._id.toString()} user=${user._id.toString()} total=${orderToReturn.total}`);
        await invalidateInventoryDerivedCaches();
        await inventoryBroadcastService.broadcastProductStockUpdates(affectedProductIds);
        await auditLogService.record({
            action: 'order.confirm_quotation',
            actorUserId: user._id.toString(),
            actorEmail: user.email,
            actorRole: user.role,
            targetType: 'order',
            targetId: orderToReturn._id.toString(),
            targetLabel: orderToReturn.orderNumber,
            message: 'Quotation confirmed and converted into an order',
            metadata: { total: orderToReturn.total, paymentStatus: orderToReturn.paymentStatus }
        });
        const notificationConfig = await siteConfigService.getOrCreateDocument();
        if (isNotificationChannelEnabled(notificationConfig.notificationSettings, 'orderConfirmed', 'emailEnabled')) {
            void Promise.resolve(emailService.sendOrderConfirmation(user.name, user.email, orderToReturn.orderNumber)).catch((error) => {
                logger.warn(`order.confirmation_email_failed order=${orderToReturn._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
            });
        }
        if (isNotificationChannelEnabled(notificationConfig.notificationSettings, 'orderConfirmed', 'smsEnabled')) {
            const customerPhone = resolveCustomerNotificationPhone(orderToReturn.shippingAddress, user.phone);
            if (customerPhone) {
                void Promise.resolve(smsService.sendOrderConfirmation(customerPhone, orderToReturn.orderNumber)).catch((error) => {
                    logger.warn(`order.confirmation_sms_failed order=${orderToReturn._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
                });
            }
        }
        try {
            await notificationService.create({
                userId: user._id.toString(),
                type: 'system',
                title: 'Order confirmed',
                body: `Your quotation was confirmed as order ${orderToReturn.orderNumber}.`,
                link: `/dashboard/orders/${orderToReturn._id.toString()}`
            });
        }
        catch (error) {
            logger.warn(`order.confirmation_notification_failed order=${orderToReturn._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
        }
        return serializeOrder(orderToReturn.toObject());
    },
    listOrders: async (userId, page = 1, limit = 10, sortBy = 'createdAt') => {
        const orderSort = sortBy === 'activity' ? { updatedAt: -1, createdAt: -1 } : { createdAt: -1 };
        const [orders, total] = await Promise.all([
            Order.find({ user: userId, deletedAt: null }).sort(orderSort).skip((page - 1) * limit).limit(limit),
            Order.countDocuments({ user: userId, deletedAt: null })
        ]);
        await Promise.all(orders.map((order) => migrateLegacyReceiptIfNeeded(order)));
        return {
            items: orders.map((order) => serializeOrder(order.toObject())),
            pagination: createPagination(page, limit, total)
        };
    },
    getOrderById: async (orderId, userId) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        ensureOrderOwnership(order.user, userId);
        await migrateLegacyReceiptIfNeeded(order);
        return serializeOrder(order.toObject());
    },
    cancelOrder: async (orderId, userId, reason) => {
        const session = await mongoose.startSession();
        let orderToReturn;
        let inventoryTransitions = [];
        try {
            await session.withTransaction(async () => {
                const order = await Order.findById(orderId).session(session);
                if (!order || order.deletedAt) {
                    throw new AppError('Order not found', 404);
                }
                ensureOrderOwnership(order.user, userId);
                const config = await siteConfigService.getOrCreateDocument();
                const hoursSinceCreation = dayjs().diff(order.createdAt, 'hour', true);
                if (!order.isQuotation && hoursSinceCreation > config.cancellationWindowHours) {
                    throw new AppError('Cancellation window has closed', 400);
                }
                if (order.status !== 'pending') {
                    throw new AppError('Only pending orders can be cancelled', 400);
                }
                inventoryTransitions = await restoreCommittedOrderEffects(order, userId, session);
                order.status = 'cancelled';
                if (order.isQuotation) {
                    order.quotationToken = undefined;
                }
                order.timeline.push({
                    status: 'cancelled',
                    note: reason ?? 'Cancelled by customer',
                    actor: 'customer',
                    createdAt: new Date()
                });
                await order.save({ session });
                orderToReturn = order;
            });
        }
        finally {
            await session.endSession();
        }
        if (!orderToReturn) {
            throw new AppError('Transaction failed', 500);
        }
        logger.info(`order.customer_cancelled order=${orderToReturn._id.toString()} user=${userId}`);
        await invalidateInventoryDerivedCaches();
        await inventoryBroadcastService.broadcastProductStockUpdates(collectAffectedProductIdsFromOrderItems(orderToReturn.items));
        for (const transition of inventoryTransitions) {
            await backInStockService.notifyOnStockTransition(transition.before, transition.after);
        }
        return serializeOrder(orderToReturn.toObject());
    },
    uploadReceipts: async (orderId, userId, files, baseUrl) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        ensureOrderOwnership(order.user, userId);
        if (order.paymentMethod === 'cash_on_delivery') {
            throw new AppError('Receipt upload is not required for Cash on Delivery orders', 400);
        }
        assertEditableReceiptState(order);
        await migrateLegacyReceiptIfNeeded(order);
        const uploadedReceipts = await Promise.all(files.map((file) => uploadBuffer({
            file,
            folder: 'receipts',
            baseUrl: getBaseUrl(baseUrl),
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            alt: `${order.orderNumber} receipt`,
            resourceType: 'auto',
            visibility: 'private'
        })));
        order.set('receipts', [
            ...(order.receipts ?? []),
            ...uploadedReceipts.map((receipt) => ({
                url: receipt.url,
                publicId: receipt.publicId,
                alt: receipt.alt,
                createdAt: new Date()
            }))
        ]);
        order.receipt = undefined;
        order.paymentStatus = 'receipt_uploaded';
        order.receiptRejectionReason = undefined;
        order.timeline.push({
            status: order.status,
            note: `Customer uploaded ${files.length} receipt${files.length > 1 ? 's' : ''}`,
            actor: 'customer',
            createdAt: new Date()
        });
        await order.save();
        logger.info(`order.receipt_uploaded order=${order._id.toString()} user=${userId} count=${files.length}`);
        return serializeOrder(order.toObject());
    },
    removeReceipt: async (orderId, userId, receiptId) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        ensureOrderOwnership(order.user, userId);
        if (order.paymentMethod === 'cash_on_delivery') {
            throw new AppError('Receipts are not used for Cash on Delivery orders', 400);
        }
        assertEditableReceiptState(order);
        await migrateLegacyReceiptIfNeeded(order);
        const receipt = order.receipts?.find((entry) => entry._id?.toString() === receiptId);
        if (!receipt) {
            throw new AppError('Receipt not found', 404);
        }
        await removeAsset(receipt.publicId);
        order.set('receipts', (order.receipts ?? []).filter((entry) => entry._id?.toString() !== receiptId));
        order.receipt = undefined;
        if ((order.receipts?.length ?? 0) === 0) {
            order.paymentStatus = 'unpaid';
            order.receiptRejectionReason = undefined;
        }
        order.timeline.push({
            status: order.status,
            note: 'Customer removed an uploaded receipt',
            actor: 'customer',
            createdAt: new Date()
        });
        await order.save();
        logger.info(`order.receipt_removed order=${order._id.toString()} user=${userId} receipt=${receiptId}`);
        return serializeOrder(order.toObject());
    },
    getInvoiceAsset: async (orderId, userId) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        ensureOrderOwnership(order.user, userId);
        if (order.paymentStatus !== 'paid') {
            throw new AppError('Invoice becomes available after admin confirms your payment', 403);
        }
        if (!order.invoicePdf) {
            throw new AppError('Invoice is not available yet', 404);
        }
        return {
            url: order.invoicePdf.url,
            publicId: order.invoicePdf.publicId,
            alt: order.invoicePdf.alt
        };
    },
    getQuotationAsset: async (orderId, userId) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        ensureOrderOwnership(order.user, userId);
        if (!order.quotationPdf) {
            throw new AppError('Quotation is not available', 404);
        }
        return {
            url: order.quotationPdf.url,
            publicId: order.quotationPdf.publicId,
            alt: order.quotationPdf.alt
        };
    },
    getReceiptAsset: async (orderId, receiptId, options) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        ensureOrderOwnership(order.user, options?.userId);
        await migrateLegacyReceiptIfNeeded(order);
        const receipt = receiptId
            ? order.receipts?.find((entry) => entry._id?.toString() === receiptId)
            : (order.receipts ?? [])[0];
        if (!receipt) {
            throw new AppError('Receipt is not available', 404);
        }
        return {
            url: receipt.url,
            publicId: receipt.publicId,
            alt: receipt.alt
        };
    },
    listAllOrders: async (filters) => {
        const page = Math.max(1, filters.page ?? 1);
        const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
        const query = { deletedAt: null, isQuotation: false };
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.paymentStatus) {
            query.paymentStatus = filters.paymentStatus;
        }
        if (filters.search) {
            query.orderNumber = buildSafeRegex(filters.search);
        }
        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('user', 'name email phone isEmailVerified')
                .populate('assignedTo', 'name email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Order.countDocuments(query)
        ]);
        await Promise.all(orders.map((order) => migrateLegacyReceiptIfNeeded(order)));
        return {
            items: orders.map((order) => serializeAdminOrder(order.toObject())),
            pagination: createPagination(page, limit, total)
        };
    },
    adminUpdateOrder: async (orderId, payload, actorName, baseUrl) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        const user = await User.findById(order.user);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        if (order.isQuotation) {
            throw new AppError('Quotations cannot be managed from admin orders', 400);
        }
        if (order.status === 'cancelled') {
            throw new AppError('Cancelled orders are read-only', 400);
        }
        if (payload.status === 'cancelled') {
            const session = await mongoose.startSession();
            let orderToReturn;
            let inventoryTransitions = [];
            try {
                await session.withTransaction(async () => {
                    const transactionalOrder = await Order.findById(orderId).session(session);
                    if (!transactionalOrder || transactionalOrder.deletedAt) {
                        throw new AppError('Order not found', 404);
                    }
                    if (!adminAllowedTransitions[transactionalOrder.status].includes('cancelled')) {
                        throw new AppError(`Cannot move order from ${transactionalOrder.status} to cancelled`, 400);
                    }
                    inventoryTransitions = await restoreCommittedOrderEffects(transactionalOrder, transactionalOrder.user.toString(), session);
                    transactionalOrder.status = 'cancelled';
                    transactionalOrder.timeline.push({
                        status: 'cancelled',
                        note: payload.reason ?? 'Order cancelled by admin',
                        actor: actorName,
                        createdAt: new Date()
                    });
                    await transactionalOrder.save({ session });
                    orderToReturn = transactionalOrder;
                });
            }
            finally {
                await session.endSession();
            }
            if (!orderToReturn) {
                throw new AppError('Transaction failed', 500);
            }
            logger.info(`order.admin_updated order=${orderToReturn._id.toString()} actor=${actorName} status=${orderToReturn.status} payment=${orderToReturn.paymentStatus}`);
            await invalidateInventoryDerivedCaches();
            await inventoryBroadcastService.broadcastProductStockUpdates(collectAffectedProductIdsFromOrderItems(orderToReturn.items));
            for (const transition of inventoryTransitions) {
                await backInStockService.notifyOnStockTransition(transition.before, transition.after);
            }
            await notificationService.create({
                userId: user._id.toString(),
                type: 'system',
                title: 'Order cancelled',
                body: `Order ${orderToReturn.orderNumber} was cancelled by support.`,
                link: `/dashboard/orders/${orderToReturn._id.toString()}`
            });
            return serializeOrder(orderToReturn.toObject());
        }
        const session = await mongoose.startSession();
        let orderToReturn;
        let receiptRejectedEmail = null;
        let shouldGenerateInvoice = false;
        let customerUpdateNotification = null;
        try {
            await session.withTransaction(async () => {
                const transactionalOrder = await Order.findById(orderId).session(session);
                if (!transactionalOrder || transactionalOrder.deletedAt) {
                    throw new AppError('Order not found', 404);
                }
                const transactionalUser = await User.findById(transactionalOrder.user).session(session);
                if (!transactionalUser) {
                    throw new AppError('User not found', 404);
                }
                if (transactionalOrder.isQuotation) {
                    throw new AppError('Quotations cannot be managed from admin orders', 400);
                }
                if (transactionalOrder.status === 'cancelled') {
                    throw new AppError('Cancelled orders are read-only', 400);
                }
                const previousStatus = transactionalOrder.status;
                const previousPaymentStatus = transactionalOrder.paymentStatus;
                const previousTrackingNumber = transactionalOrder.trackingNumber ?? undefined;
                const previousAssignedToId = transactionalOrder.assignedTo?.toString();
                let assignmentNote = null;
                if (payload.paymentStatus === 'rejected') {
                    if (!payload.reason) {
                        throw new AppError('Rejection reason is required', 400);
                    }
                    transactionalOrder.paymentStatus = 'rejected';
                    transactionalOrder.paidAt = undefined;
                    transactionalOrder.receiptRejectionReason = payload.reason;
                    transactionalOrder.timeline.push({
                        status: transactionalOrder.status,
                        note: `Receipt rejected: ${payload.reason}`,
                        actor: actorName,
                        createdAt: new Date()
                    });
                    await transactionalOrder.save({ session });
                    receiptRejectedEmail = {
                        name: transactionalUser.name,
                        email: transactionalUser.email,
                        phone: resolveCustomerNotificationPhone(transactionalOrder.shippingAddress, transactionalUser.phone),
                        orderNumber: transactionalOrder.orderNumber,
                        reason: payload.reason
                    };
                    customerUpdateNotification = {
                        userId: transactionalUser._id.toString(),
                        title: 'Payment receipt rejected',
                        body: `Your payment receipt for ${transactionalOrder.orderNumber} was rejected: ${payload.reason.trim()}.`,
                        link: `/dashboard/orders/${transactionalOrder._id.toString()}`
                    };
                    orderToReturn = transactionalOrder;
                    return;
                }
                if (payload.assignedToId !== undefined) {
                    if (payload.assignedToId === null) {
                        transactionalOrder.assignedTo = undefined;
                        if (previousAssignedToId) {
                            assignmentNote = 'Order unassigned';
                        }
                    }
                    else {
                        const assignedAdmin = await User.findById(payload.assignedToId).session(session);
                        if (!assignedAdmin || !['admin', 'staff'].includes(assignedAdmin.role) || assignedAdmin.isActive === false) {
                            throw new AppError('Assigned staff member must be an active admin or staff user', 400);
                        }
                        transactionalOrder.assignedTo = assignedAdmin._id;
                        if (previousAssignedToId !== assignedAdmin._id.toString()) {
                            assignmentNote = `Order assigned to ${assignedAdmin.name}`;
                        }
                    }
                }
                if (payload.paymentStatus === 'paid') {
                    await migrateLegacyReceiptIfNeeded(transactionalOrder, session);
                    transactionalOrder.paymentStatus = 'paid';
                    if (previousPaymentStatus !== 'paid') {
                        transactionalOrder.paidAt = new Date();
                    }
                    transactionalOrder.receiptRejectionReason = undefined;
                    if (transactionalOrder.status === 'pending') {
                        transactionalOrder.status = 'processing';
                    }
                }
                if (payload.status) {
                    if (!adminAllowedTransitions[transactionalOrder.status].includes(payload.status)) {
                        throw new AppError(`Cannot move order from ${transactionalOrder.status} to ${payload.status}`, 400);
                    }
                    if (payload.status === 'shipped' && !payload.trackingNumber && !transactionalOrder.trackingNumber) {
                        throw new AppError('Tracking number is required before marking shipped', 400);
                    }
                    transactionalOrder.status = payload.status;
                }
                if (payload.trackingNumber) {
                    transactionalOrder.trackingNumber = payload.trackingNumber;
                }
                if (transactionalOrder.status === 'delivered' && !transactionalOrder.loyaltyPointsGranted) {
                    transactionalOrder.loyaltyPointsGranted = true;
                    transactionalUser.loyaltyPoints += transactionalOrder.loyaltyPointsAwarded;
                    await transactionalUser.save({ session });
                    await new LoyaltyTransaction({
                        user: transactionalUser._id,
                        order: transactionalOrder._id,
                        type: 'earned',
                        points: transactionalOrder.loyaltyPointsAwarded,
                        description: `Delivered order ${transactionalOrder.orderNumber}`
                    }).save({ session });
                }
                const noteParts = [];
                if (payload.paymentStatus === 'paid' && previousPaymentStatus !== transactionalOrder.paymentStatus) {
                    noteParts.push('Payment marked as paid');
                }
                if (previousStatus !== transactionalOrder.status) {
                    noteParts.push(`Status updated to ${transactionalOrder.status}`);
                }
                if (payload.trackingNumber && previousTrackingNumber !== transactionalOrder.trackingNumber) {
                    noteParts.push(`Tracking number updated to ${transactionalOrder.trackingNumber}`);
                }
                if (assignmentNote) {
                    noteParts.push(assignmentNote);
                }
                const customerUpdateParts = [];
                const didStatusChange = previousStatus !== transactionalOrder.status;
                const didPaymentChangeToPaid = payload.paymentStatus === 'paid' && previousPaymentStatus !== transactionalOrder.paymentStatus;
                const didTrackingNumberChange = payload.trackingNumber && previousTrackingNumber !== transactionalOrder.trackingNumber;
                if (didStatusChange) {
                    customerUpdateParts.push(`Status: ${orderStatusLabel(transactionalOrder.status)}.`);
                }
                if (didPaymentChangeToPaid) {
                    customerUpdateParts.push('Payment confirmed.');
                }
                if (didTrackingNumberChange && transactionalOrder.trackingNumber) {
                    customerUpdateParts.push(`Tracking number: ${transactionalOrder.trackingNumber}.`);
                }
                if (customerUpdateParts.length) {
                    const notificationTitle = didStatusChange
                        ? transactionalOrder.status === 'shipped'
                            ? 'Order shipped'
                            : transactionalOrder.status === 'delivered'
                                ? 'Order delivered'
                                : transactionalOrder.status === 'processing'
                                    ? 'Order processing'
                                    : transactionalOrder.status === 'cancelled'
                                        ? 'Order cancelled'
                                        : 'Order updated'
                        : didPaymentChangeToPaid
                            ? 'Payment confirmed'
                            : didTrackingNumberChange
                                ? 'Tracking updated'
                                : 'Order updated';
                    customerUpdateNotification = {
                        userId: transactionalUser._id.toString(),
                        title: notificationTitle,
                        body: `Order ${transactionalOrder.orderNumber} updated. ${customerUpdateParts.join(' ')}`,
                        link: `/dashboard/orders/${transactionalOrder._id.toString()}`
                    };
                }
                transactionalOrder.timeline.push({
                    status: transactionalOrder.status,
                    note: payload.reason ?? (noteParts.join(' • ') || `Order updated to ${transactionalOrder.status}`),
                    actor: actorName,
                    createdAt: new Date()
                });
                shouldGenerateInvoice =
                    transactionalOrder.paymentStatus === 'paid' && !transactionalOrder.invoicePdf && !transactionalOrder.isQuotation;
                await transactionalOrder.save({ session });
                orderToReturn = transactionalOrder;
            });
        }
        finally {
            await session.endSession();
        }
        if (!orderToReturn) {
            throw new AppError('Transaction failed', 500);
        }
        if (receiptRejectedEmail) {
            const notificationConfig = await siteConfigService.getOrCreateDocument();
            if (isNotificationChannelEnabled(notificationConfig.notificationSettings, 'receiptRejected', 'emailEnabled')) {
                await emailService.sendReceiptRejected(receiptRejectedEmail.name, receiptRejectedEmail.email, receiptRejectedEmail.orderNumber, receiptRejectedEmail.reason);
            }
            if (isNotificationChannelEnabled(notificationConfig.notificationSettings, 'receiptRejected', 'smsEnabled') && receiptRejectedEmail.phone) {
                await smsService.sendReceiptRejected(receiptRejectedEmail.phone, receiptRejectedEmail.orderNumber, receiptRejectedEmail.reason);
            }
            if (customerUpdateNotification) {
                await notificationService.create({
                    userId: customerUpdateNotification.userId,
                    type: 'system',
                    title: customerUpdateNotification.title,
                    body: customerUpdateNotification.body,
                    link: customerUpdateNotification.link
                });
            }
            return serializeOrder(orderToReturn.toObject());
        }
        if (shouldGenerateInvoice) {
            try {
                const siteConfig = await siteConfigService.getConfig();
                const invoiceBuffer = await generateOrderPdfBuffer(serializeOrder(orderToReturn.toObject()), siteConfig, 'INVOICE', user.email, user.name);
                orderToReturn.invoicePdf = await uploadGeneratedBuffer({
                    buffer: invoiceBuffer,
                    fileName: `${orderToReturn.orderNumber}.pdf`,
                    mimeType: 'application/pdf',
                    folder: 'documents/invoices',
                    baseUrl: getBaseUrl(baseUrl),
                    alt: `${orderToReturn.orderNumber} invoice`
                });
                await orderToReturn.save();
            }
            catch (error) {
                logger.warn(`order.invoice_generation_failed order=${orderToReturn._id.toString()} reason=${error instanceof Error ? error.message : 'unknown'}`);
            }
        }
        logger.info(`order.admin_updated order=${orderToReturn._id.toString()} actor=${actorName} status=${orderToReturn.status} payment=${orderToReturn.paymentStatus}`);
        if (customerUpdateNotification) {
            await notificationService.create({
                userId: customerUpdateNotification.userId,
                type: 'system',
                title: customerUpdateNotification.title,
                body: customerUpdateNotification.body,
                link: customerUpdateNotification.link
            });
        }
        await invalidateAnalyticsCache();
        return serializeOrder(orderToReturn.toObject());
    },
    sendShippingNotification: async (orderId, actorName) => {
        const order = await Order.findById(orderId);
        if (!order || order.deletedAt) {
            throw new AppError('Order not found', 404);
        }
        if (order.isQuotation) {
            throw new AppError('Quotations cannot send shipping notifications', 400);
        }
        if (order.type !== 'delivery') {
            throw new AppError('Shipping notifications are only available for delivery orders', 400);
        }
        if (order.status !== 'shipped') {
            throw new AppError('Shipping notifications can only be sent after the order is marked shipped', 400);
        }
        if (!order.trackingNumber) {
            throw new AppError('Tracking number is required before sending a shipping notification', 400);
        }
        const user = await User.findById(order.user);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        const notificationConfig = await siteConfigService.getOrCreateDocument();
        const orderUrl = `${env.CLIENT_URL}/dashboard/orders/${order._id.toString()}`;
        const emailEnabled = isNotificationChannelEnabled(notificationConfig.notificationSettings, 'orderShipped', 'emailEnabled');
        const smsEnabled = isNotificationChannelEnabled(notificationConfig.notificationSettings, 'orderShipped', 'smsEnabled');
        const customerPhone = resolveCustomerNotificationPhone(order.shippingAddress, user.phone);
        const canSendSms = smsEnabled && Boolean(customerPhone);
        if (!emailEnabled && !canSendSms) {
            throw new AppError('Shipping notifications are disabled in store settings', 400);
        }
        if (emailEnabled) {
            await emailService.sendOrderShipped(user.name, user.email, order.orderNumber, order.trackingNumber, orderUrl);
        }
        if (canSendSms && customerPhone) {
            await smsService.sendOrderShipped(customerPhone, order.orderNumber, order.trackingNumber, orderUrl);
        }
        order.timeline.push({
            status: order.status,
            note: 'Shipping notification sent to customer',
            actor: actorName,
            createdAt: new Date()
        });
        await order.save();
        await notificationService.create({
            userId: user._id.toString(),
            type: 'system',
            title: 'Shipping update sent',
            body: `Shipping details for ${order.orderNumber} are now available. Tracking number: ${order.trackingNumber}.`,
            link: `/dashboard/orders/${order._id.toString()}`
        });
        return {
            orderNumber: order.orderNumber,
            recipient: user.email,
            trackingNumber: order.trackingNumber
        };
    },
    adminMergeOrders: async (keepOrderId, mergeOrderId, actorName, reason) => {
        if (keepOrderId === mergeOrderId) {
            throw new AppError('Choose two different orders to merge', 400);
        }
        const siteConfig = await siteConfigService.getOrCreateDocument();
        const session = await mongoose.startSession();
        let mergedOrderToReturn;
        try {
            await session.withTransaction(async () => {
                const [keepOrder, mergeOrder] = await Promise.all([
                    Order.findById(keepOrderId).session(session),
                    Order.findById(mergeOrderId).session(session)
                ]);
                if (!keepOrder || keepOrder.deletedAt || !mergeOrder || mergeOrder.deletedAt) {
                    throw new AppError('Order not found', 404);
                }
                if (keepOrder.isQuotation || mergeOrder.isQuotation) {
                    throw new AppError('Quotations cannot be merged from admin orders', 400);
                }
                if (!['pending', 'processing'].includes(keepOrder.status) || !['pending', 'processing'].includes(mergeOrder.status)) {
                    throw new AppError('Only pending or processing orders can be merged', 400);
                }
                if (!['unpaid', 'receipt_uploaded'].includes(keepOrder.paymentStatus) || !['unpaid', 'receipt_uploaded'].includes(mergeOrder.paymentStatus)) {
                    throw new AppError('Only unpaid or receipt-review orders can be merged', 400);
                }
                if (keepOrder.user.toString() !== mergeOrder.user.toString()) {
                    throw new AppError('Only orders from the same customer can be merged', 400);
                }
                if (keepOrder.type !== mergeOrder.type) {
                    throw new AppError('Only orders with the same fulfilment type can be merged', 400);
                }
                if (keepOrder.paymentMethod !== mergeOrder.paymentMethod) {
                    throw new AppError('Only orders with the same payment method can be merged', 400);
                }
                if (keepOrder.type === 'delivery' && !areEquivalentAddresses(keepOrder.shippingAddress, mergeOrder.shippingAddress)) {
                    throw new AppError('Delivery orders must have the same destination before they can be merged', 400);
                }
                if (keepOrder.type === 'pickup' && normalizeComparableText(keepOrder.pickupSlot) !== normalizeComparableText(mergeOrder.pickupSlot)) {
                    throw new AppError('Pickup orders must have the same pickup slot before they can be merged', 400);
                }
                await Promise.all([migrateLegacyReceiptIfNeeded(keepOrder, session), migrateLegacyReceiptIfNeeded(mergeOrder, session)]);
                const mergedSubtotal = keepOrder.subtotal + mergeOrder.subtotal;
                const mergedDiscount = keepOrder.discount + mergeOrder.discount;
                const mergedLoyaltyPointsRedeemed = (keepOrder.loyaltyPointsRedeemed ?? 0) + (mergeOrder.loyaltyPointsRedeemed ?? 0);
                const mergedLoyaltyDiscount = (keepOrder.loyaltyDiscount ?? 0) + (mergeOrder.loyaltyDiscount ?? 0);
                const mergedShippingFee = keepOrder.type === 'delivery' ? Math.max(keepOrder.shippingFee, mergeOrder.shippingFee) : 0;
                const mergedTaxableAmount = Math.max(mergedSubtotal + mergedShippingFee - mergedDiscount - mergedLoyaltyDiscount, 0);
                const mergedTaxSnapshot = calculateTaxSnapshot(keepOrder.taxRate || mergeOrder.taxRate
                    ? {
                        enabled: true,
                        label: keepOrder.taxLabel || mergeOrder.taxLabel || siteConfig.taxSettings?.label || 'VAT',
                        rate: keepOrder.taxRate || mergeOrder.taxRate || siteConfig.taxSettings?.rate || 0
                    }
                    : siteConfig.taxSettings, mergedTaxableAmount);
                const mergedTotal = Math.max(mergedTaxableAmount + mergedTaxSnapshot.taxAmount, 0);
                const mergedStatus = keepOrder.status === 'processing' || mergeOrder.status === 'processing' ? 'processing' : 'pending';
                const mergedPaymentStatus = keepOrder.paymentStatus === 'receipt_uploaded' || mergeOrder.paymentStatus === 'receipt_uploaded' ? 'receipt_uploaded' : 'unpaid';
                const latestEstimatedDeliveryDate = [keepOrder.estimatedDeliveryDate, mergeOrder.estimatedDeliveryDate]
                    .filter((value) => Boolean(value))
                    .sort((left, right) => left.getTime() - right.getTime())
                    .at(-1);
                keepOrder.set('items', [...keepOrder.items, ...mergeOrder.items]);
                keepOrder.set('receipts', [...(keepOrder.receipts ?? []), ...(mergeOrder.receipts ?? [])]);
                keepOrder.status = mergedStatus;
                keepOrder.paymentStatus = mergedPaymentStatus;
                keepOrder.subtotal = mergedSubtotal;
                keepOrder.shippingFee = mergedShippingFee;
                keepOrder.discount = mergedDiscount;
                keepOrder.taxAmount = mergedTaxSnapshot.taxAmount;
                keepOrder.taxLabel = mergedTaxSnapshot.taxLabel;
                keepOrder.taxRate = mergedTaxSnapshot.taxRate;
                keepOrder.total = mergedTotal;
                keepOrder.loyaltyPointsAwarded = Math.floor(mergedTaxableAmount / siteConfig.loyaltyPointsRate);
                keepOrder.loyaltyPointsRedeemed = mergedLoyaltyPointsRedeemed;
                keepOrder.loyaltyDiscount = mergedLoyaltyDiscount;
                keepOrder.assignedTo = keepOrder.assignedTo ?? mergeOrder.assignedTo;
                keepOrder.couponCode =
                    keepOrder.couponCode && mergeOrder.couponCode && keepOrder.couponCode !== mergeOrder.couponCode
                        ? undefined
                        : keepOrder.couponCode ?? mergeOrder.couponCode;
                keepOrder.notes = combineUniqueText(keepOrder.notes, mergeOrder.notes);
                keepOrder.deliveryNotes = combineUniqueText(keepOrder.deliveryNotes, mergeOrder.deliveryNotes);
                keepOrder.internalNote = combineUniqueText(keepOrder.internalNote, `Includes merged order ${mergeOrder.orderNumber}`);
                keepOrder.receiptRejectionReason = undefined;
                keepOrder.estimatedDeliveryDate = latestEstimatedDeliveryDate;
                keepOrder.estimatedDeliveryDays =
                    latestEstimatedDeliveryDate && mergeOrder.estimatedDeliveryDate?.getTime() === latestEstimatedDeliveryDate.getTime()
                        ? mergeOrder.estimatedDeliveryDays
                        : keepOrder.estimatedDeliveryDays ?? mergeOrder.estimatedDeliveryDays;
                const mergeNote = reason?.trim() || `Merged ${mergeOrder.orderNumber} into this order for combined ${keepOrder.type === 'delivery' ? 'shipping' : 'pickup'}`;
                keepOrder.timeline.push({
                    status: keepOrder.status,
                    note: mergeNote,
                    actor: actorName,
                    createdAt: new Date()
                });
                mergeOrder.internalNote = combineUniqueText(mergeOrder.internalNote, `Merged into ${keepOrder.orderNumber}`);
                mergeOrder.timeline.push({
                    status: mergeOrder.status,
                    note: `Merged into ${keepOrder.orderNumber}`,
                    actor: actorName,
                    createdAt: new Date()
                });
                mergeOrder.deletedAt = new Date();
                await Promise.all([keepOrder.save({ session }), mergeOrder.save({ session })]);
                mergedOrderToReturn = keepOrder;
            });
        }
        finally {
            await session.endSession();
        }
        if (!mergedOrderToReturn) {
            throw new AppError('Transaction failed', 500);
        }
        logger.info(`order.admin_merged keep=${mergedOrderToReturn._id.toString()} merged=${mergeOrderId} actor=${actorName} total=${mergedOrderToReturn.total}`);
        await invalidateAnalyticsCache();
        return serializeOrder(mergedOrderToReturn.toObject());
    },
    softDeleteOrder: async (orderId) => {
        await Order.findByIdAndUpdate(orderId, { deletedAt: new Date() });
        await invalidateAnalyticsCache();
    },
    exportOrdersCsv: async () => {
        const orders = await Order.find({ deletedAt: null, isQuotation: false }).populate('user').sort({ createdAt: -1 });
        const rows = [
            [
                'Order Number',
                'Date',
                'Customer',
                'Email',
                'Items',
                'Subtotal',
                'Shipping',
                'Discount',
                'Tax',
                'Total',
                'Payment Status',
                'Order Status',
                'Order Type',
                'Tracking Number'
            ].map(escapeCsv).join(',')
        ];
        for (const order of orders) {
            const populatedUser = order.user;
            rows.push([
                escapeCsv(order.orderNumber),
                escapeCsv(dayjs(order.createdAt).format('YYYY-MM-DD')),
                escapeCsv(populatedUser?.name ?? ''),
                escapeCsv(populatedUser?.email ?? ''),
                escapeCsv(order.items.map((item) => `${item.name} x${item.quantity}`).join('; ')),
                escapeCsv(String(order.subtotal)),
                escapeCsv(String(order.shippingFee)),
                escapeCsv(String(order.discount)),
                escapeCsv(String(order.taxAmount ?? 0)),
                escapeCsv(String(order.total)),
                escapeCsv(order.paymentStatus),
                escapeCsv(order.status),
                escapeCsv(order.type),
                escapeCsv(order.trackingNumber ?? '')
            ].join(','));
        }
        return rows.join('\n');
    }
};
