import type { ReviewDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }): T => payload.data.data;

export const reviewService = {
  listByProduct: async (productId: string) => unwrap<ReviewDto[]>(await api.get(`/reviews/product/${productId}`)),
  create: async (payload: { product: string; rating: number; title: string; comment: string }) =>
    unwrap<ReviewDto>(await api.post('/reviews', payload)),
  toggleHelpful: async (reviewId: string) => unwrap<ReviewDto>(await api.post(`/reviews/${reviewId}/helpful`))
};
