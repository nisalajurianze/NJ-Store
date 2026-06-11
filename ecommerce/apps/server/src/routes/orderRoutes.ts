import { Router } from 'express';
import {
  cancelOrder,
  createReturnRequest,
  confirmQuotation,
  createQuotation,
  deleteReceiptFile,
  getQuotationByToken,
  getInvoice,
  getLegacyReceipt,
  getQuotation,
  getReceipt,
  getOrder,
  listReturnRequests,
  listOrders,
  uploadReturnEvidenceFiles,
  uploadReceiptFiles
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { requireFile, uploadReceipt, uploadReturnEvidence } from '../middleware/upload.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  confirmQuotationBodySchema,
  confirmQuotationParamsSchema,
  createQuotationSchema,
  orderIdParamsSchema,
  orderListQuerySchema,
  orderReceiptParamsSchema
} from '../validators/orderValidators.js';
import { createReturnRequestSchema, returnEvidenceParamsSchema } from '../validators/returnValidators.js';

const router = Router();

router.use(protect);
router.get('/quotation/:token', validateParams(confirmQuotationParamsSchema), getQuotationByToken);
router.post('/quotation/:token/confirm', validateParams(confirmQuotationParamsSchema), validateBody(confirmQuotationBodySchema), confirmQuotation);
router.post('/', validateBody(createQuotationSchema), createQuotation);
router.get('/', validateQuery(orderListQuerySchema), listOrders);
router.get('/:id', validateParams(orderIdParamsSchema), getOrder);
router.patch('/:id/cancel', validateParams(orderIdParamsSchema), cancelOrder);
router.get('/:id/returns', validateParams(orderIdParamsSchema), listReturnRequests);
router.post('/:id/returns', validateParams(orderIdParamsSchema), validateBody(createReturnRequestSchema), createReturnRequest);
router.post('/:id/returns/:returnId/evidence', validateParams(returnEvidenceParamsSchema), uploadRateLimiter, uploadReturnEvidence, requireFile('evidence'), uploadReturnEvidenceFiles);
router.post('/:id/receipts', validateParams(orderIdParamsSchema), uploadRateLimiter, uploadReceipt, requireFile('receipt'), uploadReceiptFiles);
router.post('/:id/receipt', validateParams(orderIdParamsSchema), uploadRateLimiter, uploadReceipt, requireFile('receipt'), uploadReceiptFiles);
router.delete('/:id/receipts/:receiptId', validateParams(orderReceiptParamsSchema), deleteReceiptFile);
router.get('/:id/receipts/:receiptId', validateParams(orderReceiptParamsSchema), getReceipt);
router.get('/:id/receipt', validateParams(orderIdParamsSchema), getLegacyReceipt);
router.get('/:id/quotation', validateParams(orderIdParamsSchema), getQuotation);
router.get('/:id/invoice', validateParams(orderIdParamsSchema), getInvoice);

export default router;
