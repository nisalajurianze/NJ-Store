import { describe, expect, it } from 'vitest';
import { formatLkr } from './utils/format.js';
describe('formatLkr', () => {
    it('formats Sri Lankan rupees without decimals', () => {
        expect(formatLkr(12345)).toContain('12,345');
    });
});
