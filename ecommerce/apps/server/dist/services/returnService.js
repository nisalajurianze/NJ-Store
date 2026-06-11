import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createPagination } from '../utils/pagination.js';
import { buildSafeRegex } from '../utils/regex.js';
import { notificationService } from './notificationService.js';
import { uploadBuffer } from './uploadService.js';
import { serializeAdminReturnRequest, serializeReturnRequest } from '../utils/serializers.js';
const ACTIVE_RETURN_STATUSES = ['pending', 'approved'];
const ensureEligibleOrder = (order) => {
    if (order.deletedAt) {
        throw new AppError('Order not found', 404);
    }
    if (order.isQuotation) {
        throw new AppError('Quotations cannot be returned', 400);
    }
    if (order.status !== 'delivered') {
        throw new AppError('Only delivered orders can be returned', 400);
    }
    if (order.paymentStatus !== 'paid') {
        throw new AppError('Only paid orders can be refunded', 400);
    }
};
const normalizeVariantIndex = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
const makeRequestedItemKey = (item) => `${item.sku.trim()}::${item.variantIndex ?? 'default'}`;
const orderItemToRequestInput = (item) => ({
    sku: item.sku,
    quantity: item.quantity,
    variantIndex: normalizeVariantIndex(item.variantIndex)
});
const roundCurrency = (value) => Math.round(value * 100) / 100;
const resolveRefundTotals = (selectedSubtotal, payload) => {
    if (payload.refundAmount !== undefined && payload.refundAmount > selectedSubtotal) {
        throw new AppError('Refund amount cannot exceed the selected returned item total', 400);
    }
    const refundAmount = payload.refundAmount !== undefined
        ? payload.refundAmount
        : payload.refundPercent !== undefined
            ? selectedSubtotal * (payload.refundPercent / 100)
            : selectedSubtotal;
    const refundPercent = payload.refundPercent !== undefined
        ? payload.refundPercent
        : selectedSubtotal > 0
            ? (refundAmount / selectedSubtotal) * 100
            : 0;
    return {
        refundAmount: roundCurrency(refundAmount),
        refundPercent: roundCurrency(refundPercent)
    };
};
const buildReturnSelection = (orderItems, payload) => {
    const requestedItems = payload.items?.length ? payload.items : orderItems.map(orderItemToRequestInput);
    const orderItemMap = new Map(orderItems.map((item) => [
        makeRequestedItemKey({ sku: item.sku, variantIndex: normalizeVariantIndex(item.variantIndex) }),
        item
    ]));
    const items = requestedItems.map((requestedItem) => {
        const orderItem = orderItemMap.get(makeRequestedItemKey(requestedItem));
        if (!orderItem) {
            throw new AppError(`Return item ${requestedItem.sku} was not found on this order`, 400);
        }
        if (requestedItem.quantity > orderItem.quantity) {
            throw new AppError(`Return quantity for ${orderItem.name} cannot exceed the ordered quantity`, 400);
        }
        const unitPrice = orderItem.price;
        const lineTotal = roundCurrency(unitPrice * requestedItem.quantity);
        return {
            product: orderItem.product,
            name: orderItem.name,
            sku: orderItem.sku,
            quantity: requestedItem.quantity,
            unitPrice,
            lineTotal,
            variantIndex: normalizeVariantIndex(orderItem.variantIndex)
        };
    });
    const selectedSubtotal = roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const totals = resolveRefundTotals(selectedSubtotal, payload);
    return {
        items,
        ...totals
    };
};
const createReturnNotification = async (userId, payload) => {
    if (payload.type === 'created') {
        await notificationService.create({
            userId,
            type: 'return_request_created',
            title: 'Return request submitted',
            body: `We received your return request for ${payload.orderNumber}.`,
            link: `/dashboard/orders/${payload.orderId}`
        });
        return;
    }
    if (payload.type === 'approved') {
        await notificationService.create({
            userId,
            type: 'return_request_approved',
            title: 'Return request approved',
            body: `Your return request for ${payload.orderNumber} has been approved.`,
            link: `/dashboard/orders/${payload.orderId}`
        });
        return;
    }
    if (payload.type === 'rejected') {
        await notificationService.create({
            userId,
            type: 'return_request_rejected',
            title: 'Return request rejected',
            body: payload.adminNote?.trim()
                ? `Your return request for ${payload.orderNumber} was rejected: ${payload.adminNote.trim()}`
                : `Your return request for ${payload.orderNumber} was rejected.`,
            link: `/dashboard/orders/${payload.orderId}`
        });
        return;
    }
    await notificationService.create({
        userId,
        type: 'return_request_refunded',
        title: 'Refund completed',
        body: `Your refund for ${payload.orderNumber} has been completed.`,
        link: `/dashboard/orders/${payload.orderId}`
    });
};
export const returnService = {
    createRequest: async (userId, orderId, payload) => {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404);
        }
        if (order.user.toString() !== userId) {
            throw new AppError('Order not found', 404);
        }
        ensureEligibleOrder(order);
        const existingActiveRequest = await ReturnRequest.findOne({
            order: order._id,
            status: { $in: ACTIVE_RETURN_STATUSES }
        });
        if (existingActiveRequest) {
            throw new AppError('A return request already exists for this order', 400);
        }
        const selection = buildReturnSelection(order.items, payload);
        const returnRequest = await ReturnRequest.create({
            user: order.user,
            order: order._id,
            orderNumber: order.orderNumber,
            reason: payload.reason.trim(),
            refundAmount: selection.refundAmount,
            refundPercent: selection.refundPercent,
            items: selection.items
        });
        order.timeline.push({
            status: order.status,
            note: 'Return request submitted by customer',
            actor: 'customer',
            createdAt: new Date()
        });
        await order.save();
        await createReturnNotification(userId, {
            type: 'created',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber
        });
        return serializeReturnRequest(returnRequest.toObject());
    },
    listForOrder: async (userId, orderId) => {
        const order = await Order.findById(orderId).select('_id user');
        if (!order || order.user.toString() !== userId) {
            throw new AppError('Order not found', 404);
        }
        const requests = await ReturnRequest.find({ user: userId, order: orderId }).sort({ createdAt: -1 });
        return requests.map((request) => serializeReturnRequest(request.toObject()));
    },
    uploadEvidence: async (returnRequestId, userId, files, baseUrl, uploadedBy) => {
        const returnRequest = await ReturnRequest.findById(returnRequestId);
        if (!returnRequest) {
            throw new AppError('Return request not found', 404);
        }
        if (uploadedBy === 'customer' && returnRequest.user.toString() !== userId) {
            throw new AppError('Return request not found', 404);
        }
        if (returnRequest.status === 'refunded') {
            throw new AppError('Evidence cannot be added after the refund is completed', 400);
        }
        const uploadedAssets = await Promise.all(files.map((file) => uploadBuffer({
            file,
            folder: 'returns',
            baseUrl,
            visibility: 'public',
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            resourceType: 'auto',
            alt: file.originalname
        })));
        returnRequest.evidence.push(...uploadedAssets.map((asset) => ({
            ...asset,
            uploadedBy,
            uploadedAt: new Date()
        })));
        await returnRequest.save();
        if (uploadedBy === 'admin') {
            const updatedRequest = await ReturnRequest.findById(returnRequestId)
                .populate('user', 'name email')
                .populate('handledBy', 'name email')
                .lean();
            if (!updatedRequest) {
                throw new AppError('Return request not found', 404);
            }
            return serializeAdminReturnRequest(updatedRequest);
        }
        return serializeReturnRequest(returnRequest.toObject());
    },
    listAll: async (filters) => {
        const page = Math.max(1, filters.page ?? 1);
        const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
        const query = {};
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.search) {
            query.orderNumber = buildSafeRegex(filters.search);
        }
        const [requests, total] = await Promise.all([
            ReturnRequest.find(query)
                .populate('user', 'name email')
                .populate('handledBy', 'name email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ReturnRequest.countDocuments(query)
        ]);
        return {
            items: requests.map((request) => serializeAdminReturnRequest(request)),
            pagination: createPagination(page, limit, total)
        };
    },
    updateStatus: async (returnRequestId, payload, actor) => {
        const session = await mongoose.startSession();
        let committedOrderId = null;
        let committedOrderNumber = null;
        let committedUserId = null;
        let committedAdminNote;
        try {
            await session.withTransaction(async () => {
                const returnRequest = await ReturnRequest.findById(returnRequestId).session(session);
                if (!returnRequest) {
                    throw new AppError('Return request not found', 404);
                }
                const order = await Order.findById(returnRequest.order).session(session);
                if (!order || order.deletedAt) {
                    throw new AppError('Order not found', 404);
                }
                const customer = await User.findById(returnRequest.user).session(session);
                if (!customer) {
                    throw new AppError('User not found', 404);
                }
                if (payload.status !== 'rejected' && (payload.items?.length || payload.refundAmount !== undefined || payload.refundPercent !== undefined)) {
                    const selection = buildReturnSelection(order.items, {
                        items: payload.items ??
                            returnRequest.items.map((item) => ({
                                sku: item.sku,
                                quantity: item.quantity,
                                variantIndex: normalizeVariantIndex(item.variantIndex)
                            })),
                        refundAmount: payload.refundAmount,
                        refundPercent: payload.refundPercent
                    });
                    returnRequest.set('items', selection.items);
                    returnRequest.refundAmount = selection.refundAmount;
                    returnRequest.refundPercent = selection.refundPercent;
                }
                if (payload.status === 'approved') {
                    if (returnRequest.status !== 'pending') {
                        throw new AppError('Only pending return requests can be approved', 400);
                    }
                    returnRequest.status = 'approved';
                    returnRequest.adminNote = payload.adminNote?.trim() || undefined;
                    returnRequest.handledBy = new mongoose.Types.ObjectId(actor.id);
                    returnRequest.approvedAt = new Date();
                    order.timeline.push({
                        status: order.status,
                        note: 'Return request approved by admin',
                        actor: actor.name,
                        createdAt: new Date()
                    });
                }
                if (payload.status === 'rejected') {
                    if (returnRequest.status !== 'pending') {
                        throw new AppError('Only pending return requests can be rejected', 400);
                    }
                    returnRequest.status = 'rejected';
                    returnRequest.adminNote = payload.adminNote?.trim() || undefined;
                    returnRequest.handledBy = new mongoose.Types.ObjectId(actor.id);
                    returnRequest.rejectedAt = new Date();
                    order.timeline.push({
                        status: order.status,
                        note: 'Return request rejected by admin',
                        actor: actor.name,
                        createdAt: new Date()
                    });
                }
                if (payload.status === 'refunded') {
                    if (returnRequest.status !== 'approved') {
                        throw new AppError('Only approved return requests can be refunded', 400);
                    }
                    returnRequest.status = 'refunded';
                    returnRequest.adminNote = payload.adminNote?.trim() || returnRequest.adminNote;
                    returnRequest.handledBy = new mongoose.Types.ObjectId(actor.id);
                    returnRequest.refundedAt = new Date();
                    order.timeline.push({
                        status: order.status,
                        note: 'Refund completed',
                        actor: actor.name,
                        createdAt: new Date()
                    });
                }
                await Promise.all([returnRequest.save({ session }), order.save({ session })]);
                committedOrderId = order._id.toString();
                committedOrderNumber = order.orderNumber;
                committedUserId = customer._id.toString();
                committedAdminNote = returnRequest.adminNote ?? undefined;
            });
        }
        finally {
            await session.endSession();
        }
        if (!committedOrderId || !committedOrderNumber || !committedUserId) {
            throw new AppError('Transaction failed', 500);
        }
        await createReturnNotification(committedUserId, {
            type: payload.status,
            orderId: committedOrderId,
            orderNumber: committedOrderNumber,
            adminNote: committedAdminNote
        });
        const updatedRequest = await ReturnRequest.findById(returnRequestId)
            .populate('user', 'name email')
            .populate('handledBy', 'name email')
            .lean();
        if (!updatedRequest) {
            throw new AppError('Return request not found', 404);
        }
        return serializeAdminReturnRequest(updatedRequest);
    }
};
