import type { BrandDto, PaginatedResult } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T; pagination?: PaginatedResult<T>['pagination'] } }): { data: T; pagination?: PaginatedResult<T>['pagination'] } => ({
  data: payload.data.data,
  pagination: payload.data.pagination
});

export const brandService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: 'name' | 'sortOrder';
  }) => unwrap<BrandDto[]>(await api.get('/brands', { params })),
  detail: async (slug: string) => unwrap<BrandDto>(await api.get(`/brands/${slug}`))
};
