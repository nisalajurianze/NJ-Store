import { authService } from '../services/authService.js';
import { socketTicketService } from '../services/socketTicketService.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { uploadBuffer } from '../services/uploadService.js';
import { createCsrfToken } from '../middleware/csrf.js';
import { AppError } from '../utils/AppError.js';
const requestMeta = (req) => ({
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? ''
});
const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const requestHost = (req) => req.hostname;
export const csrf = catchAsync(async (_req, res) => {
    sendResponse(res, 200, { token: createCsrfToken() });
});
export const register = catchAsync(async (req, res) => {
    const { auth, refreshToken } = await authService.register(req.body, requestMeta(req));
    res.cookie('refreshToken', refreshToken, authService.getRefreshCookieOptions(false, requestHost(req)));
    sendResponse(res, 201, auth, 'Registration successful');
});
export const login = catchAsync(async (req, res) => {
    const { auth, refreshToken } = await authService.login(req.body.email, req.body.password, req.body.rememberMe ?? false, requestMeta(req));
    res.cookie('refreshToken', refreshToken, authService.getRefreshCookieOptions(req.body.rememberMe ?? false, requestHost(req)));
    sendResponse(res, 200, auth, 'Login successful');
});
export const googleLogin = catchAsync(async (req, res) => {
    const { auth, refreshToken } = await authService.loginWithGoogle(req.body.credential, req.body.rememberMe ?? false, req.body.workspaceAccess ?? false, requestMeta(req));
    res.cookie('refreshToken', refreshToken, authService.getRefreshCookieOptions(req.body.rememberMe ?? false, requestHost(req)));
    sendResponse(res, 200, auth, 'Login successful');
});
export const refresh = catchAsync(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;
    const { auth, refreshToken, rememberMe } = await authService.refresh(rawRefreshToken ?? '', requestMeta(req));
    res.cookie('refreshToken', refreshToken, authService.getRefreshCookieOptions(rememberMe, requestHost(req)));
    sendResponse(res, 200, auth, 'Token refreshed');
});
export const logout = catchAsync(async (req, res) => {
    await authService.logout(req.cookies.refreshToken);
    res.clearCookie('refreshToken', authService.getRefreshCookieClearOptions(requestHost(req)));
    sendResponse(res, 200, undefined, 'Logged out');
});
export const logoutAll = catchAsync(async (req, res) => {
    await authService.logoutAll(req.user.id);
    res.clearCookie('refreshToken', authService.getRefreshCookieClearOptions(requestHost(req)));
    sendResponse(res, 200, undefined, 'All sessions revoked');
});
export const verifyEmail = catchAsync(async (req, res) => {
    await authService.verifyEmail(req.body.token);
    sendResponse(res, 200, undefined, 'Email verified');
});
export const resendVerification = catchAsync(async (req, res) => {
    const result = await authService.resendVerification(req.user.id);
    sendResponse(res, 200, result, 'Verification email sent');
});
export const forgotPassword = catchAsync(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    sendResponse(res, 200, undefined, 'If the account exists, a reset email has been sent');
});
export const resetPassword = catchAsync(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    sendResponse(res, 200, undefined, 'Password reset successful');
});
export const getMe = catchAsync(async (req, res) => {
    const auth = await authService.getMe(req.user.id, req.user?.sessionId);
    sendResponse(res, 200, auth);
});
export const getSessions = catchAsync(async (req, res) => {
    const sessions = await authService.listSessions(req.user.id, req.user?.sessionId);
    sendResponse(res, 200, sessions);
});
export const issueSocketTicket = catchAsync(async (req, res) => {
    if (!req.user?.sessionId) {
        throw new AppError('Authentication required', 401);
    }
    const ticket = socketTicketService.issue({
        id: req.user.id,
        role: req.user.role,
        sessionId: req.user.sessionId
    });
    sendResponse(res, 201, ticket);
});
export const getLoyaltyHistory = catchAsync(async (req, res) => {
    const entries = await authService.listLoyaltyTransactions(req.user.id);
    sendResponse(res, 200, entries);
});
export const updateProfile = catchAsync(async (req, res) => {
    const auth = await authService.updateProfile(req.user.id, req.body);
    sendResponse(res, 200, auth, 'Profile updated');
});
export const updateAvatar = catchAsync(async (req, res) => {
    const file = req.file;
    if (!file) {
        sendResponse(res, 400, undefined, 'Avatar is required');
        return;
    }
    const avatar = await uploadBuffer({
        file,
        folder: 'avatars',
        baseUrl: baseUrl(req),
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        alt: 'User avatar'
    });
    const auth = await authService.updateProfile(req.user.id, { avatar });
    sendResponse(res, 200, auth, 'Avatar updated');
});
export const updatePassword = catchAsync(async (req, res) => {
    await authService.updatePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.clearCookie('refreshToken', authService.getRefreshCookieClearOptions(requestHost(req)));
    sendResponse(res, 200, undefined, 'Password updated. Please sign in again.');
});
export const addAddress = catchAsync(async (req, res) => {
    const auth = await authService.addAddress(req.user.id, req.body);
    sendResponse(res, 201, auth, 'Address added');
});
export const updateAddress = catchAsync(async (req, res) => {
    const auth = await authService.updateAddress(req.user.id, String(req.params.addressId), req.body);
    sendResponse(res, 200, auth, 'Address updated');
});
export const deleteAddress = catchAsync(async (req, res) => {
    const auth = await authService.deleteAddress(req.user.id, String(req.params.addressId));
    sendResponse(res, 200, auth, 'Address deleted');
});
export const setDefaultAddress = catchAsync(async (req, res) => {
    const auth = await authService.setDefaultAddress(req.user.id, String(req.params.addressId));
    sendResponse(res, 200, auth, 'Default address updated');
});
