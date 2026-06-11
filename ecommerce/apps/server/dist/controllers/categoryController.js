import { catchAsync } from '../utils/catchAsync.js';
import { setPublicApiCache } from '../utils/cache.js';
import { sendResponse } from '../utils/api.js';
import { catalogAdminService } from '../services/admin/index.js';
export const getCategories = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 300, staleWhileRevalidate: 900 });
    const data = await catalogAdminService.listCategories();
    sendResponse(res, 200, data);
});
