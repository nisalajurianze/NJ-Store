import { couponAdminService } from '../../services/admin/index.js';
import { auditLogService } from '../../services/auditLogService.js';
import { adminOrderService as orderService } from '../../services/order/index.js';
import { isLocalAsset, resolveAssetDeliveryUrl, resolveLocalAssetPath } from '../../services/uploadService.js';
import { AppError } from '../../utils/AppError.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { baseUrl, requestAudit, routeId } from './helpers.js';
const deliverProtectedAsset = async (res, asset) => {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    if (isLocalAsset(asset.publicId)) {
        res.sendFile(resolveLocalAssetPath(asset.publicId));
        return;
    }
    let upstreamResponse;
    try {
        upstreamResponse = await fetch(resolveAssetDeliveryUrl(asset));
    }
    catch {
        throw new AppError('Unable to retrieve the requested file right now', 502);
    }
    if (!upstreamResponse.ok) {
        throw new AppError('Unable to retrieve the requested file right now', 502);
    }
    const contentType = upstreamResponse.headers.get('content-type');
    const contentDisposition = upstreamResponse.headers.get('content-disposition');
    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentType) {
        res.setHeader('Content-Type', contentType);
    }
    if (contentDisposition) {
        res.setHeader('Content-Disposition', contentDisposition);
    }
    if (contentLength) {
        res.setHeader('Content-Length', contentLength);
    }
    res.status(200).send(Buffer.from(await upstreamResponse.arrayBuffer()));
};
export const listOrders = catchAsync(async (req, res) => {
    const data = await orderService.listAllOrders({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        search: req.query.search
    });
    sendResponse(res, 200, data.items, undefined, data.pagination);
});
export const createOrder = catchAsync(async (req, res) => {
    const data = await orderService.adminCreateOrder(req.body, req.user.email, baseUrl(req));
    await auditLogService.record({
        action: 'admin.order.create',
        targetType: 'order',
        targetId: data.id,
        targetLabel: data.orderNumber,
        message: 'Manual order created by admin',
        metadata: {
            status: data.status,
            paymentStatus: data.paymentStatus,
            total: data.total,
            customerEmail: req.body.customerEmail
        },
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, 'Order created');
});
export const updateOrder = catchAsync(async (req, res) => {
    const data = await orderService.adminUpdateOrder(routeId(req), req.body, req.user.email, baseUrl(req));
    await auditLogService.record({
        action: 'admin.order.update',
        targetType: 'order',
        targetId: data.id,
        targetLabel: data.orderNumber,
        message: 'Order updated by admin',
        metadata: {
            status: data.status,
            paymentStatus: data.paymentStatus,
            trackingNumber: data.trackingNumber ?? undefined,
            assignedToId: typeof req.body.assignedToId === 'string' || req.body.assignedToId === null ? req.body.assignedToId : undefined
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Order updated');
});
export const sendOrderShippingNotification = catchAsync(async (req, res) => {
    const orderId = routeId(req);
    const data = await orderService.sendShippingNotification(orderId, req.user.email);
    await auditLogService.record({
        action: 'admin.order.send_shipping_notification',
        targetType: 'order',
        targetId: orderId,
        targetLabel: data.orderNumber,
        message: 'Shipping notification sent by admin',
        metadata: {
            recipient: data.recipient,
            trackingNumber: data.trackingNumber
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Shipping notification sent');
});
export const mergeOrders = catchAsync(async (req, res) => {
    const data = await orderService.adminMergeOrders(req.body.keepOrderId, req.body.mergeOrderId, req.user.email, req.body.reason);
    await auditLogService.record({
        action: 'admin.order.merge',
        targetType: 'order',
        targetId: data.id,
        targetLabel: data.orderNumber,
        message: 'Orders merged by admin',
        metadata: {
            keepOrderId: req.body.keepOrderId,
            mergeOrderId: req.body.mergeOrderId
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Orders merged');
});
export const exportOrders = catchAsync(async (req, res) => {
    const csv = await orderService.exportOrdersCsv();
    await auditLogService.record({
        action: 'admin.order.export',
        targetType: 'order',
        targetId: 'csv',
        targetLabel: 'orders.csv',
        message: 'Orders exported as CSV by admin',
        ...requestAudit(req)
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.status(200).send(csv);
});
export const deleteOrder = catchAsync(async (req, res) => {
    const orderId = routeId(req);
    await orderService.softDeleteOrder(orderId);
    await auditLogService.record({
        action: 'admin.order.archive',
        targetType: 'order',
        targetId: orderId,
        message: 'Order archived by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'Order archived');
});
export const getOrderReceipt = catchAsync(async (req, res) => {
    const asset = await orderService.getReceiptAsset(routeId(req), String(req.params.receiptId));
    await deliverProtectedAsset(res, asset);
});
export const getLegacyOrderReceipt = catchAsync(async (req, res) => {
    const asset = await orderService.getReceiptAsset(routeId(req));
    await deliverProtectedAsset(res, asset);
});
export const listCoupons = catchAsync(async (_req, res) => {
    const data = await couponAdminService.listCoupons();
    sendResponse(res, 200, data);
});
export const createCoupon = catchAsync(async (req, res) => {
    const data = await couponAdminService.createCoupon(req.body);
    await auditLogService.record({
        action: 'admin.coupon.create',
        targetType: 'coupon',
        targetId: data._id.toString(),
        targetLabel: data.code,
        message: 'Coupon created by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, 'Coupon created');
});
export const updateCoupon = catchAsync(async (req, res) => {
    const data = await couponAdminService.updateCoupon(routeId(req), req.body);
    await auditLogService.record({
        action: 'admin.coupon.update',
        targetType: 'coupon',
        targetId: data._id.toString(),
        targetLabel: data.code,
        message: 'Coupon updated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Coupon updated');
});
export const deleteCoupon = catchAsync(async (req, res) => {
    const couponId = routeId(req);
    await couponAdminService.removeCoupon(couponId);
    await auditLogService.record({
        action: 'admin.coupon.deactivate',
        targetType: 'coupon',
        targetId: couponId,
        message: 'Coupon deactivated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'Coupon deactivated');
});
