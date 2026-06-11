import { dashboardService } from '../services/dashboardService.js';
import { sendResponse } from '../utils/api.js';
import { catchAsync } from '../utils/catchAsync.js';
export const getDashboardSummary = catchAsync(async (req, res) => {
    const data = await dashboardService.getSummary(req.user.id);
    sendResponse(res, 200, data);
});
