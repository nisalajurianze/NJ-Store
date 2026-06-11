import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import i18n from '../i18n';

const originalConsoleWarn = console.warn.bind(console);

vi.spyOn(console, 'warn').mockImplementation((firstArg: unknown, ...rest: unknown[]) => {
  if (typeof firstArg === 'string' && firstArg.includes('React Router Future Flag Warning')) {
    return;
  }

  originalConsoleWarn(firstArg, ...rest);
});

vi.mock('react-helmet-async', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    Helmet: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    HelmetProvider: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children)
  };
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

if (!window.IntersectionObserver) {
  class IntersectionObserverMock implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds = [0];

    disconnect = vi.fn();
    observe = vi.fn();
    takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
    unobserve = vi.fn();
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverMock
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverMock
  });
}

afterEach(() => {
  void i18n.changeLanguage('en');
  cleanup();
});
