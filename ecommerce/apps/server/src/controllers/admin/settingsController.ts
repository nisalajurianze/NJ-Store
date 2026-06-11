import { settingsAdminService, analyticsAdminService } from '../../services/admin/index.js';
import { auditLogService } from '../../services/auditLogService.js';
import { AppError } from '../../utils/AppError.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { baseUrl, requestAudit, routeId } from './helpers.js';

export const createExternalExpense = catchAsync(async (req, res) => {
  const data = await analyticsAdminService.createExternalExpense(req.body);
  await auditLogService.record({
    action: 'admin.expense.create',
    targetType: 'expense',
    targetId: data.id,
    targetLabel: data.label,
    message: 'External expense created by admin',
    metadata: {
      amount: data.amount,
      incurredOn: data.incurredOn,
      category: data.category
    },
    ...requestAudit(req)
  });
  sendResponse(res, 201, data, 'Expense created');
});

export const updateExternalExpense = catchAsync(async (req, res) => {
  const data = await analyticsAdminService.updateExternalExpense(routeId(req), req.body);
  await auditLogService.record({
    action: 'admin.expense.update',
    targetType: 'expense',
    targetId: data.id,
    targetLabel: data.label,
    message: 'External expense updated by admin',
    metadata: {
      amount: data.amount,
      incurredOn: data.incurredOn,
      category: data.category
    },
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Expense updated');
});

export const deleteExternalExpense = catchAsync(async (req, res) => {
  const expenseId = routeId(req);
  await analyticsAdminService.deleteExternalExpense(expenseId);
  await auditLogService.record({
    action: 'admin.expense.delete',
    targetType: 'expense',
    targetId: expenseId,
    message: 'External expense deleted by admin',
    ...requestAudit(req)
  });
  sendResponse(res, 200, undefined, 'Expense deleted');
});

export const uploadStoreLogoAsset = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('A store logo image is required', 400);
  }

  const data = await settingsAdminService.uploadStoreLogo(req.file, baseUrl(req), typeof req.body.alt === 'string' ? req.body.alt : undefined);
  await auditLogService.record({
    action: 'admin.settings.upload_logo',
    targetType: 'settings',
    targetId: data.publicId,
    targetLabel: data.alt ?? 'Store logo',
    message: 'Store logo uploaded by admin',
    ...requestAudit(req)
  });
  sendResponse(res, 201, data, 'Store logo uploaded');
});

export const uploadHomeBannerImageAsset = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('A home banner image is required', 400);
  }

  const data = await settingsAdminService.uploadHomeBannerImage(req.file, baseUrl(req), typeof req.body.alt === 'string' ? req.body.alt : undefined);
  await auditLogService.record({
    action: 'admin.banner.upload_image',
    targetType: 'banner',
    targetId: data.publicId,
    targetLabel: data.alt ?? data.publicId,
    message: 'Home banner image uploaded by admin',
    ...requestAudit(req)
  });
  sendResponse(res, 201, data, 'Home banner image uploaded');
});

export const getSettings = catchAsync(async (_req, res) => {
  const data = await settingsAdminService.getSettings();
  sendResponse(res, 200, data);
});

export const updateSettings = catchAsync(async (req, res) => {
  const data = await settingsAdminService.updateSettings(req.body);
  await auditLogService.record({
    action: 'admin.settings.update',
    targetType: 'settings',
    targetId: 'site-config',
    targetLabel: data.storeName,
    message: 'Store settings updated by admin',
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Settings updated');
});
