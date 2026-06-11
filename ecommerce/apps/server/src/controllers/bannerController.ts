import { auditLogService } from '../services/auditLogService.js';
import { bannerService } from '../services/bannerService.js';
import { sendResponse } from '../utils/api.js';
import { setNoStoreCache } from '../utils/cache.js';
import { catchAsync } from '../utils/catchAsync.js';

const requestAudit = (req: import('express').Request) => ({
  actorUserId: req.user?.id,
  actorEmail: req.user?.email,
  actorRole: req.user?.role,
  ipAddress: req.ip,
  userAgent: req.get('user-agent') ?? ''
});

export const getPublicHomeHeroBanner = catchAsync(async (_req, res) => {
  // Banner content is edited from the admin app and should reflect quickly on the storefront.
  setNoStoreCache(res);
  const data = await bannerService.getPublicHomeHeroBanner();
  sendResponse(res, 200, data);
});

export const getAdminHomeHeroBanner = catchAsync(async (_req, res) => {
  const data = await bannerService.getAdminHomeHeroBanner();
  sendResponse(res, 200, data);
});

export const upsertHomeHeroBanner = catchAsync(async (req, res) => {
  const data = await bannerService.upsertHomeHeroBanner(req.body);
  await auditLogService.record({
    action: 'admin.banner.update',
    targetType: 'banner',
    targetId: data.id,
    targetLabel: data.title,
    message: 'Home hero banner updated by admin',
    metadata: {
      key: data.key,
      ctaUrl: data.ctaUrl,
      isActive: data.isActive,
      adSlotCount: data.adSlots.length,
      showcaseProductCount: data.showcaseProducts.length
    },
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Home banner updated');
});
