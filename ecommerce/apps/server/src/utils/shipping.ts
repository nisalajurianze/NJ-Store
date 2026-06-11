import type { AddressDto, ShippingResultDto } from '@njstore/types';
import { env } from '../config/env.js';

const shippingRates: Record<string, number> = {
  Colombo: 350,
  Gampaha: 350,
  Kalutara: 400,
  Kandy: 500,
  Galle: 500,
  Matara: 550,
  default: 600
};

/**
 * Calculates the shipping fee and ETA for an order.
 */
export const calculateShipping = (
  address: AddressDto,
  subtotal: number,
  freeShippingThreshold = env.FREE_SHIPPING_THRESHOLD
): ShippingResultDto => {
  if (subtotal >= freeShippingThreshold) {
    return { fee: 0, label: 'Free Shipping', days: '3-5' };
  }

  const fee = shippingRates[address.city] ?? shippingRates.default;
  const days = fee <= 400 ? '2-3' : '4-6';
  return { fee, label: `Standard Delivery (${days} days)`, days };
};
