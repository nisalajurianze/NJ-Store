import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './apiError';

describe('store api error helpers', () => {
  it('maps axios timeout errors to a user-friendly message', () => {
    const timeoutError = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded'
    };

    expect(getApiErrorMessage(timeoutError)).toBe('The server took too long to respond. Please try again.');
  });

  it('preserves explicit API messages before falling back to timeout handling', () => {
    const apiError = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
      response: {
        data: {
          message: 'Checkout is recalculating totals.'
        }
      }
    };

    expect(getApiErrorMessage(apiError)).toBe('Checkout is recalculating totals.');
  });
});
