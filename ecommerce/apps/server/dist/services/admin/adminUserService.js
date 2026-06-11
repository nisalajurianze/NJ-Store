import { adminService as adminLegacyService } from './adminLegacyService.js';
export const adminUserService = {
    listUsers: adminLegacyService.listUsers,
    listUserLoginHistory: adminLegacyService.listUserLoginHistory,
    mergeUsers: adminLegacyService.mergeUsers,
    getBroadcastAudienceSummary: adminLegacyService.getBroadcastAudienceSummary,
    sendBroadcastEmail: adminLegacyService.sendBroadcastEmail,
    updateUser: adminLegacyService.updateUser,
    removeUser: adminLegacyService.removeUser,
    permanentlyDeleteUser: adminLegacyService.permanentlyDeleteUser
};
