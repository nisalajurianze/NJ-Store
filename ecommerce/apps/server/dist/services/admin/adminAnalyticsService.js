import { adminService as adminLegacyService } from './adminLegacyService.js';
export const adminAnalyticsService = {
    getAnalytics: adminLegacyService.getAnalytics,
    exportAnalyticsPdf: adminLegacyService.exportAnalyticsPdf,
    getSalesAnalysis: adminLegacyService.getSalesAnalysis,
    exportSalesAnalysisPdf: adminLegacyService.exportSalesAnalysisPdf,
    createExternalExpense: adminLegacyService.createExternalExpense,
    updateExternalExpense: adminLegacyService.updateExternalExpense,
    deleteExternalExpense: adminLegacyService.deleteExternalExpense
};
