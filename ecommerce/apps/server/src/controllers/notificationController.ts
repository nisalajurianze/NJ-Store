import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { notificationService } from '../services/notificationService.js';

export const listNotifications = catchAsync(async (req, res) => {
  const data = await notificationService.listForUser(req.user!.id, Number(req.query.page), Number(req.query.limit));
  sendResponse(res, 200, data.items, undefined, data.pagination);
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const data = await notificationService.markAsRead(String(req.params.id), req.user!.id);
  sendResponse(res, 200, data, 'Notification marked as read');
});
