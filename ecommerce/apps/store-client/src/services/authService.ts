import type { AuthPayloadDto, LoyaltyTransactionDto, ShopPreferencesDto, VerificationEmailResultDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }): T => payload.data.data;

export const authService = {
  register: async (payload: { name: string; email: string; password: string; phone?: string; language?: 'en' | 'si' }) =>
    unwrap<AuthPayloadDto>(await api.post('/auth/register', payload)),
  login: async (payload: { email: string; password: string; rememberMe?: boolean }) =>
    unwrap<AuthPayloadDto>(await api.post('/auth/login', payload)),
  googleLogin: async (payload: { credential: string; rememberMe?: boolean }) =>
    unwrap<AuthPayloadDto>(await api.post('/auth/google', payload)),
  refresh: async () => unwrap<AuthPayloadDto>(await api.post('/auth/refresh')),
  issueSocketTicket: async () => unwrap<{ ticket: string; expiresIn: number }>(await api.post('/auth/socket-ticket')),
  logout: async () => {
    await api.post('/auth/logout');
  },
  logoutAll: async () => {
    await api.post('/auth/logout-all');
  },
  forgotPassword: async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  },
  resetPassword: async (token: string, password: string) => {
    await api.post('/auth/reset-password', { token, password });
  },
  verifyEmail: async (token: string) => {
    await api.post('/auth/verify-email', { token });
  },
  resendVerification: async () => unwrap<VerificationEmailResultDto>(await api.post('/auth/resend-verification')),
  me: async () => unwrap<AuthPayloadDto>(await api.get('/auth/me')),
  loyaltyHistory: async () => unwrap<LoyaltyTransactionDto[]>(await api.get('/auth/loyalty')),
  updateProfile: async (payload: { name?: string; phone?: string; language?: 'en' | 'si'; shopPreferences?: { myFilters?: ShopPreferencesDto['myFilters'] | null } }) =>
    unwrap<AuthPayloadDto>(await api.patch('/auth/profile', payload)),
  updatePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    await api.patch('/auth/password', payload);
  },
  addAddress: async (payload: Record<string, unknown>) => unwrap<AuthPayloadDto>(await api.post('/auth/addresses', payload)),
  updateAddress: async (addressId: string, payload: Record<string, unknown>) =>
    unwrap<AuthPayloadDto>(await api.patch(`/auth/addresses/${addressId}`, payload)),
  deleteAddress: async (addressId: string) => unwrap<AuthPayloadDto>(await api.delete(`/auth/addresses/${addressId}`)),
  setDefaultAddress: async (addressId: string) => unwrap<AuthPayloadDto>(await api.patch(`/auth/addresses/${addressId}/default`)),
  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return unwrap<AuthPayloadDto>(await api.post('/auth/avatar', form));
  }
};
