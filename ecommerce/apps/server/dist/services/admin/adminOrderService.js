import { orderService } from '../orderService.js';
export const adminOrderService = {
    listAllOrders: orderService.listAllOrders,
    adminUpdateOrder: orderService.adminUpdateOrder,
    adminMergeOrders: orderService.adminMergeOrders,
    getReceiptAsset: orderService.getReceiptAsset
};
