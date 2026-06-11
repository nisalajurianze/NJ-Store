import { adminService as adminLegacyService } from './adminLegacyService.js';
export const adminCouponService = {
    listCoupons: adminLegacyService.listCoupons,
    createCoupon: adminLegacyService.createCoupon,
    updateCoupon: adminLegacyService.updateCoupon,
    removeCoupon: adminLegacyService.removeCoupon
};
