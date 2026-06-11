import type { CouponApplicationDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }): T => payload.data.data;

export const couponService = {
  apply: async (
    payload: {
      code: string;
      subtotal: number;
      shippingFee?: number;
      items: Array<{ productId: string; quantity: number; variantIndex?: number }>;
    }
  ): Promise<CouponApplicationDto> =>
    unwrap<CouponApplicationDto>(await api.post('/coupons/apply', payload))
};
