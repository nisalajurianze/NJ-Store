// Analytics admin service — delegates to the core adminService implementations.
// The analytics aggregation pipeline code (~760 lines) remains in adminService.ts
// for now and is re-exported here to give controllers a domain-specific import path.
//
// Future work: move the full getAnalytics / getSalesAnalysis implementations
// into this file once the analytics pipeline is refactored for testability.
import { adminService } from '../adminService.js';
export const analyticsAdminService = {
    getAnalytics: adminService.getAnalytics,
    exportAnalyticsPdf: adminService.exportAnalyticsPdf,
    exportSalesAnalysisPdf: adminService.exportSalesAnalysisPdf,
    getSalesAnalysis: adminService.getSalesAnalysis,
    createExternalExpense: adminService.createExternalExpense,
    updateExternalExpense: adminService.updateExternalExpense,
    deleteExternalExpense: adminService.deleteExternalExpense
};
