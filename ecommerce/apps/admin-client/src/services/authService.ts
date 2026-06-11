import type { AuthPayloadDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }): T => payload.data.data;

export const authService = {
  login: async (payload: { email: string; password: string; rememberMe?: boolean }) =>
    unwrap<AuthPayloadDto>(await api.post('/auth/login', payload)),
  googleLogin: async (payload: { credential: string; rememberMe?: boolean; workspaceAccess?: boolean }) =>
    unwrap<AuthPayloadDto>(await api.post('/auth/google', payload)),
  refresh: async () => unwrap<AuthPayloadDto>(await api.post('/auth/refresh')),
  issueSocketTicket: async () => unwrap<{ ticket: string; expiresIn: number }>(await api.post('/auth/socket-ticket')),
  logout: async () => {
    await api.post('/auth/logout');
  },
  me: async () => unwrap<AuthPayloadDto>(await api.get('/auth/me'))
};
