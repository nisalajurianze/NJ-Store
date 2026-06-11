// Order service domain split — provides clean import boundaries for controllers.
//
// The core order service (orderService.ts) contains deeply intertwined
// transactional logic (inventory, coupons, shipping, notifications) that
// cannot be safely split without risk of breaking multi-document transactions.
//
// This module re-exports methods grouped by consumer (customer vs admin)
// so controllers can import from a domain-specific path.
import { orderService } from '../orderService.js';
/** Customer-facing order operations */
export const customerOrderService = {
    createQuotation: orderService.createQuotation,
    getQuotationByToken: orderService.getQuotationByToken,
    confirmQuotation: orderService.confirmQuotation,
    listOrders: orderService.listOrders,
    getOrderById: orderService.getOrderById,
    cancelOrder: orderService.cancelOrder,
    uploadReceipts: orderService.uploadReceipts,
    removeReceipt: orderService.removeReceipt,
    getInvoiceAsset: orderService.getInvoiceAsset,
    getQuotationAsset: orderService.getQuotationAsset,
    getReceiptAsset: orderService.getReceiptAsset
};
/** Admin-facing order operations */
export const adminOrderService = {
    adminCreateOrder: orderService.adminCreateOrder,
    adminUpdateOrder: orderService.adminUpdateOrder,
    adminMergeOrders: orderService.adminMergeOrders,
    listAllOrders: orderService.listAllOrders,
    softDeleteOrder: orderService.softDeleteOrder,
    exportOrdersCsv: orderService.exportOrdersCsv,
    sendShippingNotification: orderService.sendShippingNotification,
    getReceiptAsset: orderService.getReceiptAsset
};
