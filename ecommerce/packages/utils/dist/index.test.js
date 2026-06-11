import { describe, expect, it } from 'vitest';
import { addBusinessDays, buildPaginationRange, formatEstimatedDeliveryWindow, isInvalidSessionRefreshFailure, isTransientRefreshFailure, parseBusinessDayRange, slugify } from './index.js';
describe('utils', () => {
    it('slugifies values safely', () => {
        expect(slugify('NJ Store Ultra Phone')).toBe('nj-store-ultra-phone');
    });
    it('builds a centered pagination range', () => {
        expect(buildPaginationRange(4, 10)).toEqual([2, 3, 4, 5, 6]);
    });
    it('parses and formats business day delivery windows', () => {
        expect(parseBusinessDayRange('5-2')).toEqual({ min: 2, max: 5 });
        expect(addBusinessDays(new Date('2026-04-24T00:00:00Z'), 1).getUTCDay()).toBe(1);
        expect(formatEstimatedDeliveryWindow('1-2', { from: new Date('2026-04-20T00:00:00Z'), locale: 'en-US' })).toBe('Apr 21 - Apr 22');
    });
    it('classifies transient refresh failures without treating them as expired sessions', () => {
        expect(isTransientRefreshFailure({ isAxiosError: true, response: { status: 503 } })).toBe(true);
        expect(isTransientRefreshFailure({ isAxiosError: true, code: 'ERR_NETWORK', request: {} })).toBe(true);
        expect(isInvalidSessionRefreshFailure({ isAxiosError: true, response: { status: 401 } })).toBe(true);
        expect(isTransientRefreshFailure(new Error('Forbidden'))).toBe(false);
    });
});
