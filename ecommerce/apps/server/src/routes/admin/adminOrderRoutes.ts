import { Router } from 'express';
import {
  createOrder,
  deleteOrder,
  exportOrders,
  getLegacyOrderReceipt,
  getOrderReceipt,
  listOrders,
  mergeOrders,
  listReturnRequests as listAdminReturnRequests,
  sendOrderShippingNotification,
  uploadReturnEvidence,
  updateReturnRequestStatus,
  updateOrder
} from '../../controllers/admin/index.js';
import { restrictToPermission } from '../../middleware/permissions.js';
import { adminActionRateLimiter } from '../../middleware/rateLimiter.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { idParamsSchema } from '../../validators/adminValidators.js';
import {
  adminOrderCreateSchema,
  adminOrderMergeSchema,
  adminOrderQuerySchema,
  adminOrderUpdateSchema,
  orderIdParamsSchema,
  orderReceiptParamsSchema
} from '../../validators/orderValidators.js';
import { adminReturnRequestQuerySchema, adminReturnRequestUpdateSchema } from '../../validators/returnValidators.js';
import { requireFile, uploadReturnEvidence as uploadReturnEvidenceFiles } from '../../middleware/upload.js';

const router = Router();

router.get('/orders', restrictToPermission('order:read'), validateQuery(adminOrderQuerySchema), listOrders);
router.post('/orders', restrictToPermission('order:write'), adminActionRateLimiter, validateBody(adminOrderCreateSchema), createOrder);
router.get('/returns', restrictToPermission('order:read'), validateQuery(adminReturnRequestQuerySchema), listAdminReturnRequests);
router.get('/orders/export', restrictToPermission('order:read'), exportOrders);
router.post('/orders/merge', restrictToPermission('order:write'), adminActionRateLimiter, validateBody(adminOrderMergeSchema), mergeOrders);
router.get('/orders/:id/receipts/:receiptId', restrictToPermission('order:read'), validateParams(orderReceiptParamsSchema), getOrderReceipt);
router.get('/orders/:id/receipt', restrictToPermission('order:read'), validateParams(orderIdParamsSchema), getLegacyOrderReceipt);
router.patch('/orders/:id', restrictToPermission('order:write'), adminActionRateLimiter, validateParams(orderIdParamsSchema), validateBody(adminOrderUpdateSchema), updateOrder);
router.patch('/returns/:id', restrictToPermission('order:write'), adminActionRateLimiter, validateParams(idParamsSchema), validateBody(adminReturnRequestUpdateSchema), updateReturnRequestStatus);
router.post('/returns/:id/evidence', restrictToPermission('order:write'), adminActionRateLimiter, validateParams(idParamsSchema), uploadReturnEvidenceFiles, requireFile('evidence'), uploadReturnEvidence);
router.post('/orders/:id/notifications/shipping', restrictToPermission('order:write'), adminActionRateLimiter, validateParams(orderIdParamsSchema), sendOrderShippingNotification);
router.delete('/orders/:id', restrictToPermission('order:delete'), adminActionRateLimiter, validateParams(orderIdParamsSchema), deleteOrder);

export default router;
