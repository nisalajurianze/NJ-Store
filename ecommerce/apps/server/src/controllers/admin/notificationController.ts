import type { AdminPermission } from '@njstore/types';
import { notificationAdminService } from '../../services/admin/index.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const getAdminNotificationCenter = catchAsync(async (req, res) => {
  const data = await notificationAdminService.getCenter((req.user?.permissions ?? []) as AdminPermission[], req.user?.id);
  sendResponse(res, 200, data);
});

export const markAdminNotificationViewed = catchAsync(async (req, res) => {
  const data = await notificationAdminService.markViewed(
    (req.user?.permissions ?? []) as AdminPermission[],
    req.user!.id,
    String(req.params.id)
  );
  sendResponse(res, 200, data);
});
