import { Router } from 'express';
import {
  createExternalExpense,
  deleteExternalExpense,
  exportAnalyticsPdf,
  exportAuditLogs,
  exportSalesAnalysisPdf,
  getAnalytics,
  getBroadcastAudienceSummary,
  getSalesAnalysis,
  listAuditLogs,
  sendBroadcastEmail,
  updateExternalExpense
} from '../../controllers/admin/index.js';
import { restrictToPermission } from '../../middleware/permissions.js';
import { adminActionRateLimiter } from '../../middleware/rateLimiter.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import {
  analyticsQuerySchema,
  auditLogExportQuerySchema,
  auditLogQuerySchema,
  broadcastEmailSchema,
  externalExpenseSchema,
  externalExpenseUpdateSchema,
  idParamsSchema
} from '../../validators/adminValidators.js';

const router = Router();

router.get('/analytics', restrictToPermission('order:read', 'product:read', 'user:read'), validateQuery(analyticsQuerySchema), getAnalytics);
router.get('/analytics/export/pdf', restrictToPermission('order:read', 'product:read', 'user:read'), validateQuery(analyticsQuerySchema), exportAnalyticsPdf);
router.get('/sales-analysis', restrictToPermission('order:read', 'product:read', 'user:read'), getSalesAnalysis);
router.get('/sales-analysis/export/pdf', restrictToPermission('order:read', 'product:read', 'user:read'), exportSalesAnalysisPdf);
router.get('/broadcasts/audience', restrictToPermission('setting:read'), getBroadcastAudienceSummary);
router.post('/broadcasts/email', restrictToPermission('setting:write'), adminActionRateLimiter, validateBody(broadcastEmailSchema), sendBroadcastEmail);
router.post('/sales-analysis/expenses', restrictToPermission('setting:write'), adminActionRateLimiter, validateBody(externalExpenseSchema), createExternalExpense);
router.patch(
  '/sales-analysis/expenses/:id',
  restrictToPermission('setting:write'),
  adminActionRateLimiter,
  validateParams(idParamsSchema),
  validateBody(externalExpenseUpdateSchema),
  updateExternalExpense
);
router.delete('/sales-analysis/expenses/:id', restrictToPermission('setting:write'), adminActionRateLimiter, validateParams(idParamsSchema), deleteExternalExpense);
router.get('/audit-logs/export', restrictToPermission('user:read'), validateQuery(auditLogExportQuerySchema), exportAuditLogs);
router.get('/audit-logs', restrictToPermission('user:read'), validateQuery(auditLogQuerySchema), listAuditLogs);

export default router;
