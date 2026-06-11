import { Review } from '../../models/Review.js';
import { siteConfigService } from '../siteConfigService.js';
import { uploadBuffer } from '../uploadService.js';
export const settingsAdminService = {
    getSettings: async () => siteConfigService.getConfig(),
    updateSettings: async (payload) => siteConfigService.updateConfig(payload),
    uploadStoreLogo: async (file, baseUrl, alt) => uploadBuffer({
        file,
        folder: 'site-config',
        baseUrl,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        alt,
        resourceType: 'image'
    }),
    uploadHomeBannerImage: async (file, baseUrl, alt) => uploadBuffer({
        file,
        folder: 'banners',
        baseUrl,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        alt,
        resourceType: 'image'
    }),
    listPendingReviewsCount: async () => Review.countDocuments({ isApproved: false })
};
