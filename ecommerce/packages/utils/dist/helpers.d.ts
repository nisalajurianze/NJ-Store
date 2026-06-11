export { phoneSchema, postalCodeSchema } from './schemas.js';
export declare const slugify: (value: string) => string;
export declare const buildPaginationRange: (page: number, totalPages: number) => number[];
export declare const dedupeByStableKey: <T>(items: T[], resolveKey: (item: T) => string | null | undefined) => T[];
export declare const sleep: (ms: number) => Promise<void>;
