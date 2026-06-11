import { afterEach, describe, expect, it, vi } from 'vitest';

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

describe('i18n bootstrap', () => {
  afterEach(() => {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', originalLocalStorageDescriptor);
    }
    vi.resetModules();
  });

  it('initializes when browser storage is blocked', async () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Storage is blocked.', 'SecurityError');
      }
    });

    await expect(import('./i18n')).resolves.toHaveProperty('default');
  });
});
