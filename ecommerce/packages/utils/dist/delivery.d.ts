export interface BusinessDayRange {
    min: number;
    max: number;
}
export declare const parseBusinessDayRange: (value: string | undefined) => BusinessDayRange;
export declare const addBusinessDays: (startDate: Date, businessDays: number) => Date;
export declare const formatEstimatedDeliveryWindow: (businessDayWindow: string | undefined, referenceDate?: Date, locale?: string, dateOptions?: Intl.DateTimeFormatOptions) => string;
