import { adminPermissions } from '@njstore/types';
import { AppError } from '../utils/AppError.js';
export const restrictToPermission = (...requiredPermissions) => (req, _res, next) => {
    if (!req.user) {
        next(new AppError('Authentication required', 401));
        return;
    }
    const hasPermission = requiredPermissions.every((permission) => req.user?.permissions.includes(permission));
    if (!hasPermission) {
        next(new AppError('Forbidden: insufficient permissions', 403));
        return;
    }
    next();
};
const selfManagedAdminPermissions = ['user:read', 'user:write'];
const isSelfAdminPermissionRecoveryRequest = (req) => {
    if (!req.user || req.user.role !== 'admin') {
        return false;
    }
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!targetId || req.user.id !== targetId) {
        return false;
    }
    const body = req.body;
    if (!body?.permissions) {
        return false;
    }
    if (body.role !== undefined && body.role !== 'admin') {
        return false;
    }
    if (body.isActive !== undefined && body.isActive !== true) {
        return false;
    }
    const currentPermissions = new Set(req.user.permissions);
    const nextPermissions = new Set(body.permissions);
    if (!selfManagedAdminPermissions.every((permission) => nextPermissions.has(permission))) {
        return false;
    }
    return adminPermissions.every((permission) => {
        if (selfManagedAdminPermissions.includes(permission)) {
            return true;
        }
        return currentPermissions.has(permission) === nextPermissions.has(permission);
    });
};
export const restrictToPermissionOrSelfAdminRecovery = (requiredPermission) => (req, _res, next) => {
    if (!req.user) {
        next(new AppError('Authentication required', 401));
        return;
    }
    if (req.user.permissions.includes(requiredPermission) || isSelfAdminPermissionRecoveryRequest(req)) {
        next();
        return;
    }
    next(new AppError('Forbidden: insufficient permissions', 403));
};
