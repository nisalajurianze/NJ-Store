import type { NotificationDto, PaginatedResult } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T; pagination?: PaginatedResult<T>['pagination'] } }): { data: T; pagination?: PaginatedResult<T>['pagination'] } => ({
  data: payload.data.data,
  pagination: payload.data.pagination
});

export const notificationService = {
  list: async (page = 1, limit = 10) => unwrap<NotificationDto[]>(await api.get('/notifications', { params: { page, limit } })),
  markAsRead: async (id: string) => unwrap<NotificationDto>(await api.patch(`/notifications/${id}/read`))
};
