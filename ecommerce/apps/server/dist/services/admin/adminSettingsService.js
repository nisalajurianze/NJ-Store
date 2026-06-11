import { adminService as adminLegacyService } from './adminLegacyService.js';
export const adminSettingsService = {
    listCategories: adminLegacyService.listCategories,
    createCategory: adminLegacyService.createCategory,
    updateCategory: adminLegacyService.updateCategory,
    removeCategory: adminLegacyService.removeCategory,
    permanentlyDeleteCategory: adminLegacyService.permanentlyDeleteCategory,
    uploadCategoryImage: adminLegacyService.uploadCategoryImage,
    uploadStoreLogo: adminLegacyService.uploadStoreLogo,
    getSettings: adminLegacyService.getSettings,
    updateSettings: adminLegacyService.updateSettings,
    listPendingReviewsCount: adminLegacyService.listPendingReviewsCount
};
