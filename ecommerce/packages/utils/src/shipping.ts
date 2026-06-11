export interface ConfiguredShippingRate {
  city: string;
  fee: number;
  days: string;
}

export interface ResolveConfiguredShippingInput {
  city: string;
  subtotal: number;
  freeShippingThreshold: number;
  shippingRates: ConfiguredShippingRate[];
  defaultFee?: number;
  defaultDays?: string;
  freeShippingDays?: string;
}

export interface ResolvedConfiguredShipping {
  fee: number;
  days: string;
  isFree: boolean;
}

export const resolveConfiguredShipping = ({
  city,
  subtotal,
  freeShippingThreshold,
  shippingRates,
  defaultFee = 600,
  defaultDays = '4-6',
  freeShippingDays = '3-5'
}: ResolveConfiguredShippingInput): ResolvedConfiguredShipping => {
  if (subtotal >= freeShippingThreshold) {
    return {
      fee: 0,
      days: freeShippingDays,
      isFree: true
    };
  }

  const normalizedCity = city.trim().toLowerCase();
  const matchedRate =
    shippingRates.find((entry) => entry.city.toLowerCase() === normalizedCity) ??
    shippingRates.find((entry) => entry.city.toLowerCase() === 'default');

  return {
    fee: matchedRate?.fee ?? defaultFee,
    days: matchedRate?.days ?? defaultDays,
    isFree: false
  };
};
