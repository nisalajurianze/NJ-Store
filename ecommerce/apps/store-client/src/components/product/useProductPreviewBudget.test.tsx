import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductPreviewBudget } from './useProductPreviewBudget';

const mockDesktopPointer = (): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: hover) and (pointer: fine) and (min-width: 768px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
};

describe('useProductPreviewBudget', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDesktopPointer();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia
    });
  });

  it('keeps preview grants stable while the user is actively scrolling', () => {
    const { result, rerender } = renderHook(
      ({ inView }) => useProductPreviewBudget({ eligible: true, inView, priority: false }),
      {
        initialProps: { inView: true }
      }
    );

    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe(true);

    rerender({ inView: false });

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(259);
    });

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe(false);
  });
});
