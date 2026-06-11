import { Router } from 'express';
import { getAdminHomeHeroBanner, upsertHomeHeroBanner } from '../../controllers/bannerController.js';
import { getSettings, updateSettings, uploadHomeBannerImageAsset, uploadStoreLogoAsset } from '../../controllers/admin/index.js';
import { restrictToPermission } from '../../middleware/permissions.js';
import { adminActionRateLimiter, uploadRateLimiter } from '../../middleware/rateLimiter.js';
import { uploadHomeBannerImage, uploadStoreLogo } from '../../middleware/upload.js';
import { validateBody } from '../../middleware/validate.js';
import { homeHeroBannerSchema, settingsSchema } from '../../validators/adminValidators.js';

const router = Router();

router.get('/settings', restrictToPermission('setting:read'), getSettings);
router.post('/settings/logo', restrictToPermission('setting:write'), uploadRateLimiter, uploadStoreLogo, uploadStoreLogoAsset);
router.patch('/settings', restrictToPermission('setting:write'), adminActionRateLimiter, validateBody(settingsSchema), updateSettings);
router.get('/banners/home-hero', restrictToPermission('setting:read'), getAdminHomeHeroBanner);
router.post('/banners/home-hero/images', restrictToPermission('setting:write'), uploadRateLimiter, uploadHomeBannerImage, uploadHomeBannerImageAsset);
router.put('/banners/home-hero', restrictToPermission('setting:write'), adminActionRateLimiter, validateBody(homeHeroBannerSchema), upsertHomeHeroBanner);

export default router;
