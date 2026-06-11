import { adminService as adminLegacyService } from './adminLegacyService.js';
export const adminProductService = {
    importProductsCsv: adminLegacyService.importProductsCsv,
    uploadProductImages: adminLegacyService.uploadProductImages
};
