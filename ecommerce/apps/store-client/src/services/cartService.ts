import type { CartDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }): T => payload.data.data;

export const cartService = {
  get: async () => unwrap<CartDto>(await api.get('/cart')),
  add: async (payload: { productId: string; quantity: number; variantIndex?: number }) =>
    unwrap<CartDto>(await api.post('/cart', payload)),
  update: async (itemId: string, quantity: number) => unwrap<CartDto>(await api.put(`/cart/${itemId}`, { quantity })),
  remove: async (itemId: string) => unwrap<CartDto>(await api.delete(`/cart/${itemId}`)),
  clear: async () => {
    await api.delete('/cart');
  },
  sync: async (items: Array<{ productId: string; quantity: number; variantIndex?: number }>) =>
    unwrap<CartDto>(await api.post('/cart/sync', { items }))
};
