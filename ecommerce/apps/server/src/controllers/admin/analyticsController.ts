import type { AnalyticsPeriod } from '@njstore/types';
import { analyticsAdminService as adminService } from '../../services/admin/index.js';
import { auditLogService } from '../../services/auditLogService.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { requestAudit } from './helpers.js';

export const getAnalytics = catchAsync(async (req, res) => {
  const data = await adminService.getAnalytics({
    period: (typeof req.query.period === 'string' ? req.query.period : undefined) as AnalyticsPeriod | undefined,
    startDate: req.query.startDate instanceof Date ? req.query.startDate : undefined,
    endDate: req.query.endDate instanceof Date ? req.query.endDate : undefined
  });
  sendResponse(res, 200, data);
});

export const getSalesAnalysis = catchAsync(async (_req, res) => {
  const data = await adminService.getSalesAnalysis();
  sendResponse(res, 200, data);
});

export const exportAnalyticsPdf = catchAsync(async (req, res) => {
  const { buffer, filename } = await adminService.exportAnalyticsPdf({
    period: (typeof req.query.period === 'string' ? req.query.period : undefined) as AnalyticsPeriod | undefined,
    startDate: req.query.startDate instanceof Date ? req.query.startDate : undefined,
    endDate: req.query.endDate instanceof Date ? req.query.endDate : undefined
  });
  await auditLogService.record({
    action: 'admin.analytics.export',
    targetType: 'analytics',
    targetId: 'pdf',
    targetLabel: filename,
    message: 'Admin dashboard exported as PDF',
    ...requestAudit(req)
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.status(200).send(buffer);
});

export const exportSalesAnalysisPdf = catchAsync(async (req, res) => {
  const { buffer, filename } = await adminService.exportSalesAnalysisPdf();
  await auditLogService.record({
    action: 'admin.sales_analysis.export',
    targetType: 'sales_analysis',
    targetId: 'pdf',
    targetLabel: filename,
    message: 'Sales analysis exported as PDF by admin',
    ...requestAudit(req)
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.status(200).send(buffer);
});
