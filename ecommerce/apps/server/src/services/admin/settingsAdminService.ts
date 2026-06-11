import type { ImageAsset, SiteConfigDto } from '@njstore/types';
import { Review } from '../../models/Review.js';
import { siteConfigService } from '../siteConfigService.js';
import { uploadBuffer } from '../uploadService.js';

export const settingsAdminService = {
  getSettings: async (): Promise<SiteConfigDto> => siteConfigService.getConfig(),

  updateSettings: async (payload: Partial<SiteConfigDto>): Promise<SiteConfigDto> => siteConfigService.updateConfig(payload),

  uploadStoreLogo: async (file: Express.Multer.File, baseUrl: string, alt?: string): Promise<ImageAsset> =>
    uploadBuffer({
      file,
      folder: 'site-config',
      baseUrl,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      alt,
      resourceType: 'image'
    }),

  uploadHomeBannerImage: async (file: Express.Multer.File, baseUrl: string, alt?: string): Promise<ImageAsset> =>
    uploadBuffer({
      file,
      folder: 'banners',
      baseUrl,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      alt,
      resourceType: 'image'
    }),

  listPendingReviewsCount: async (): Promise<number> => Review.countDocuments({ isApproved: false })
};
