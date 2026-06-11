import { serializeProductDetail } from './product.js';
import { serializeImage, toId } from './helpers.js';
const isAdminOrderCustomerShape = (value) => Boolean(value &&
    typeof value === 'object' &&
    '_id' in value &&
    'name' in value &&
    'email' in value &&
    'isEmailVerified' in value);
const isAdminOrderAssigneeShape = (value) => Boolean(value && typeof value === 'object' && '_id' in value && 'name' in value && 'email' in value);
const serializeAddress = (address) => ({
    _id: address._id ? toId(address._id) : undefined,
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
});
const serializeProtectedImage = (image) => image
    ? {
        url: '',
        publicId: image.publicId,
        alt: image.alt ?? undefined
    }
    : undefined;
const serializeProtectedReceipt = (receipt) => receipt
    ? {
        id: receipt._id ? toId(receipt._id) : receipt.publicId,
        url: '',
        publicId: receipt.publicId,
        alt: receipt.alt ?? undefined,
        createdAt: receipt.createdAt?.toISOString()
    }
    : undefined;
const serializeProtectedReceipts = (order) => {
    if (order.receipts?.length) {
        return order.receipts.map((entry) => serializeProtectedReceipt(entry)).filter((entry) => Boolean(entry));
    }
    if (!order.receipt) {
        return [];
    }
    return [
        {
            id: order.receipt.publicId,
            url: '',
            publicId: order.receipt.publicId,
            alt: order.receipt.alt ?? undefined,
            createdAt: order.updatedAt.toISOString()
        }
    ];
};
export const serializeCart = (cart) => {
    const items = cart.items.map((item) => {
        const variant = item.variantIndex !== undefined ? item.product.variants[item.variantIndex] : undefined;
        const unitPrice = variant?.price ?? item.product.price;
        return {
            id: toId(item._id),
            product: serializeProductDetail(item.product),
            quantity: item.quantity,
            variantIndex: item.variantIndex,
            lineTotal: unitPrice * item.quantity
        };
    });
    return {
        id: toId(cart._id),
        items,
        subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
};
export const serializeOrder = (order) => ({
    id: toId(order._id),
    orderNumber: order.orderNumber,
    quotationNumber: order.quotationNumber,
    quotationToken: order.quotationToken,
    quotationExpiry: order.quotationExpiry?.toISOString(),
    isQuotation: order.isQuotation,
    fulfilmentConfigured: order.fulfilmentConfigured ?? true,
    type: order.type,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    taxAmount: order.taxAmount ?? 0,
    taxLabel: order.taxLabel ?? 'VAT',
    taxRate: order.taxRate ?? 0,
    total: order.total,
    shippingAddress: order.shippingAddress ? serializeAddress(order.shippingAddress) : undefined,
    pickupSlot: order.pickupSlot,
    notes: order.notes,
    deliveryNotes: order.deliveryNotes,
    couponCode: order.couponCode,
    items: order.items.map((item) => ({
        product: toId(item.product),
        name: item.name,
        slug: item.slug,
        image: serializeImage(item.image),
        quantity: item.quantity,
        price: item.price,
        variantLabel: item.variantLabel,
        sku: item.sku,
        bundleItems: item.bundleItems?.map((bundleItem) => ({
            product: toId(bundleItem.product),
            name: bundleItem.name,
            slug: bundleItem.slug,
            image: serializeImage(bundleItem.image),
            sku: bundleItem.sku,
            quantity: bundleItem.quantity,
            variantIndex: bundleItem.variantIndex,
            variantLabel: bundleItem.variantLabel
        }))
    })),
    trackingNumber: order.trackingNumber,
    receipts: serializeProtectedReceipts(order),
    receipt: serializeProtectedImage(order.receipt),
    receiptRejectionReason: order.receiptRejectionReason,
    quotationPdf: serializeProtectedImage(order.quotationPdf),
    invoicePdf: serializeProtectedImage(order.invoicePdf),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    estimatedDeliveryDays: order.estimatedDeliveryDays,
    estimatedDeliveryDate: order.estimatedDeliveryDate?.toISOString(),
    loyaltyPointsAwarded: order.loyaltyPointsAwarded,
    loyaltyPointsRedeemed: order.loyaltyPointsRedeemed ?? 0,
    loyaltyDiscount: order.loyaltyDiscount ?? 0,
    timeline: order.timeline.map((entry) => ({
        status: entry.status,
        note: entry.note,
        actor: entry.actor,
        createdAt: entry.createdAt.toISOString()
    }))
});
export const serializeAdminOrderCustomer = (user) => ({
    id: toId(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    isEmailVerified: user.isEmailVerified
});
export const serializeAdminOrderAssignee = (user) => ({
    id: toId(user._id),
    name: user.name,
    email: user.email
});
export const serializeAdminOrder = (order) => ({
    ...serializeOrder(order),
    customer: isAdminOrderCustomerShape(order.user) ? serializeAdminOrderCustomer(order.user) : undefined,
    assignedTo: isAdminOrderAssigneeShape(order.assignedTo) ? serializeAdminOrderAssignee(order.assignedTo) : undefined
});
export const serializeReturnRequest = (request) => ({
    id: toId(request._id),
    orderId: toId(request.order),
    orderNumber: request.orderNumber,
    status: request.status,
    reason: request.reason,
    adminNote: request.adminNote ?? undefined,
    refundAmount: request.refundAmount,
    refundPercent: request.refundPercent ?? 100,
    items: request.items.map((item) => ({
        product: toId(item.product),
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 0,
        lineTotal: item.lineTotal ?? (item.unitPrice ?? 0) * item.quantity,
        variantIndex: item.variantIndex
    })),
    evidence: (request.evidence ?? []).map((asset) => ({
        url: asset.url,
        publicId: asset.publicId,
        alt: asset.alt ?? undefined,
        uploadedBy: asset.uploadedBy ?? undefined,
        uploadedAt: asset.uploadedAt?.toISOString()
    })),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    approvedAt: request.approvedAt?.toISOString(),
    rejectedAt: request.rejectedAt?.toISOString(),
    refundedAt: request.refundedAt?.toISOString()
});
export const serializeAdminReturnRequest = (request) => ({
    ...serializeReturnRequest(request),
    customer: {
        id: toId(request.user._id),
        name: request.user.name,
        email: request.user.email
    },
    handledBy: request.handledBy
        ? {
            id: toId(request.handledBy._id),
            name: request.handledBy.name,
            email: request.handledBy.email
        }
        : undefined
});
