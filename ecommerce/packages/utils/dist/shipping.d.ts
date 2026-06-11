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
export declare const resolveConfiguredShipping: ({ city, subtotal, freeShippingThreshold, shippingRates, defaultFee, defaultDays, freeShippingDays }: ResolveConfiguredShippingInput) => ResolvedConfiguredShipping;
