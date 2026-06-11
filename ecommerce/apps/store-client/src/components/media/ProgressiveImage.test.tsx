import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgressiveImage } from './ProgressiveImage';

const mockTouchMatchMedia = (): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: none)' || query === '(pointer: coarse)',
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

describe('ProgressiveImage', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia
    });
  });

  it('uses opacity-only loading on touch devices for cheaper image reveal', () => {
    mockTouchMatchMedia();

    render(<ProgressiveImage src="https://example.com/product.jpg" alt="Gallery product" />);

    const image = screen.getByAltText('Gallery product');

    expect(image).toHaveClass('transition-opacity');
    expect(image).toHaveClass('opacity-0');
    expect(image).not.toHaveClass('blur-xl');

    fireEvent.load(image);

    expect(image).toHaveClass('opacity-100');
    expect(image).not.toHaveClass('blur-0');
  });

  it('sets fetchpriority imperatively without passing an unknown React prop', () => {
    render(<ProgressiveImage src="https://example.com/hero.jpg" alt="Hero product" fetchPriority="high" />);

    expect(screen.getByAltText('Hero product')).toHaveAttribute('fetchpriority', 'high');
  });
});
