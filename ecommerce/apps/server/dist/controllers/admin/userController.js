import { userAdminService as adminService } from '../../services/admin/index.js';
import { auditLogService } from '../../services/auditLogService.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { requestAudit, routeId } from './helpers.js';
const parseUserRoleFilter = (value) => value === 'customer' || value === 'staff' || value === 'admin' || value === 'workspace' ? value : undefined;
const parseVerificationFilter = (value) => value === 'verified' || value === 'unverified' ? value : undefined;
const parseBooleanFilter = (value) => value === true || value === 'true';
export const listUsers = catchAsync(async (req, res) => {
    const data = await adminService.listUsers({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        role: parseUserRoleFilter(req.query.role),
        verification: parseVerificationFilter(req.query.verification),
        includeInactive: parseBooleanFilter(req.query.includeInactive)
    });
    sendResponse(res, 200, data.items, undefined, data.pagination);
});
export const listUserLoginHistory = catchAsync(async (req, res) => {
    const data = await adminService.listUserLoginHistory(routeId(req));
    sendResponse(res, 200, data);
});
export const mergeUsers = catchAsync(async (req, res) => {
    const data = await adminService.mergeUsers(req.body.keepUserId, req.body.mergeUserId, req.user.id);
    await auditLogService.record({
        action: 'admin.user.merge',
        targetType: 'user',
        targetId: data.keepUser.id,
        targetLabel: data.keepUser.email,
        message: 'Duplicate customer account merged by admin',
        metadata: {
            mergedUserId: data.mergedUserId,
            transferred: data.transferred
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Users merged');
});
export const updateUser = catchAsync(async (req, res) => {
    const data = await adminService.updateUser(routeId(req), req.body, req.user.id);
    await auditLogService.record({
        action: 'admin.user.update',
        targetType: 'user',
        targetId: data.id,
        targetLabel: data.email,
        message: 'User updated by admin',
        metadata: { role: data.role, isActive: data.isActive },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'User updated');
});
export const deleteUser = catchAsync(async (req, res) => {
    const userId = routeId(req);
    await adminService.removeUser(userId, req.user.id);
    await auditLogService.record({
        action: 'admin.user.deactivate',
        targetType: 'user',
        targetId: userId,
        message: 'User deactivated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'User deactivated');
});
export const permanentlyDeleteUser = catchAsync(async (req, res) => {
    const userId = routeId(req);
    await adminService.permanentlyDeleteUser(userId, req.user.id);
    await auditLogService.record({
        action: 'admin.user.delete_permanent',
        targetType: 'user',
        targetId: userId,
        message: 'User deleted permanently by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'User deleted permanently');
});
