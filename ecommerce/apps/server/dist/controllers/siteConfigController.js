import { catchAsync } from '../utils/catchAsync.js';
import { setNoStoreCache, setPublicApiCache } from '../utils/cache.js';
import { sendResponse } from '../utils/api.js';
import { siteConfigService } from '../services/siteConfigService.js';
import { auditLogService } from '../services/auditLogService.js';
const requestAudit = (req) => ({
    actorUserId: req.user?.id,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? ''
});
export const getPublicSiteConfig = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 300, sharedMaxAge: 900, staleWhileRevalidate: 1800 });
    const data = await siteConfigService.getConfig();
    sendResponse(res, 200, data);
});
export const getPublicFooter = catchAsync(async (_req, res) => {
    setNoStoreCache(res);
    const data = await siteConfigService.getFooter();
    sendResponse(res, 200, data);
});
export const updateFooter = catchAsync(async (req, res) => {
    const data = await siteConfigService.updateFooter(req.body);
    await auditLogService.record({
        action: 'admin.footer.update',
        targetType: 'settings',
        targetId: 'footer',
        targetLabel: data.companyName,
        message: 'Footer settings updated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Footer updated');
});
