import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

const originalConsoleWarn = console.warn.bind(console);

vi.spyOn(console, 'warn').mockImplementation((firstArg: unknown, ...rest: unknown[]) => {
  if (typeof firstArg === 'string' && firstArg.includes('React Router Future Flag Warning')) {
    return;
  }

  originalConsoleWarn(firstArg, ...rest);
});

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn()
});

afterEach(() => {
  cleanup();
});
