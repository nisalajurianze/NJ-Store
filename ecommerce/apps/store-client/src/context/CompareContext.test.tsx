import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompareProvider, useCompare } from './CompareContext';

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

const installBlockedLocalStorage = (): void => {
  const blockedStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
    getItem: vi.fn(() => {
      throw new DOMException('Storage is blocked.', 'SecurityError');
    }),
    setItem: vi.fn(() => {
      throw new DOMException('Storage is blocked.', 'SecurityError');
    }),
    removeItem: vi.fn(() => {
      throw new DOMException('Storage is blocked.', 'SecurityError');
    })
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: blockedStorage
  });
};

const CompareConsumer = (): JSX.Element => {
  const { clearCompare, items, toggleCompare } = useCompare();

  return (
    <div>
      <p>Compare count: {items.length}</p>
      <button type="button" onClick={() => toggleCompare('product-1')}>
        Toggle compare
      </button>
      <button type="button" onClick={clearCompare}>
        Clear compare
      </button>
    </div>
  );
};

describe('CompareProvider', () => {
  afterEach(() => {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', originalLocalStorageDescriptor);
    }
  });

  it('keeps rendering when localStorage reads and writes are unavailable', () => {
    installBlockedLocalStorage();

    render(
      <CompareProvider>
        <CompareConsumer />
      </CompareProvider>
    );

    expect(screen.getByText('Compare count: 0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle compare' }));

    expect(screen.getByText('Compare count: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear compare' }));

    expect(screen.getByText('Compare count: 0')).toBeInTheDocument();
  });
});
