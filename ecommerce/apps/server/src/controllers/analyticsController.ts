import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { customerBehaviorService } from '../services/customerBehaviorService.js';

export const recordAnalyticsEvents = catchAsync(async (req, res) => {
  const data = await customerBehaviorService.recordEvents(req.body.events, req.user?.id);
  sendResponse(res, 202, data, 'Analytics events accepted');
});
