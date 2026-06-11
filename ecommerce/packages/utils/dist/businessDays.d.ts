export interface BusinessDayRange {
    min: number;
    max: number;
}
export declare const parseBusinessDayRange: (value: string | undefined) => BusinessDayRange;
export declare const addBusinessDays: (startDate: Date, businessDays: number) => Date;
export declare const formatEstimatedDeliveryWindow: (businessDayWindow: string | undefined, options?: {
    from?: Date;
    locale?: string | string[];
}) => string;
