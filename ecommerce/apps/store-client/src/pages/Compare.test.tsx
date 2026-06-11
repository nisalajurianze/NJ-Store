import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductComparisonDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  clearCompareMock: vi.fn(),
  compareMock: vi.fn(),
  toggleCompareMock: vi.fn()
}));

vi.mock('../context/CompareContext', () => ({
  useCompare: () => ({
    items: ['product-1', 'product-2'],
    clearCompare: mocks.clearCompareMock,
    toggleCompare: mocks.toggleCompareMock
  })
}));

vi.mock('../hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (amount: number) => `LKR ${amount.toLocaleString('en-US')}`
  })
}));

vi.mock('../services/productService', () => ({
  productService: {
    compare: mocks.compareMock
  }
}));

import { Compare } from './Compare';

const comparisonProducts: ProductComparisonDto[] = [
  {
    id: 'product-1',
    name: 'JBL Charge 5',
    brand: 'JBL',
    price: 63690,
    ratings: {
      average: 0,
      count: 0
    },
    specifications: [
      { key: 'Model', value: 'JBL Charge 5' },
      { key: 'Warranty', value: '1 Year Manufacturer Warranty' },
      { key: 'Origin', value: 'Official Sri Lankan Stock' },
      { key: 'Connectivity', value: 'Wi-Fi 6 / Bluetooth 5.x / USB-C' },
      { key: 'Battery', value: '20 hours' },
      { key: 'Waterproofing', value: 'IP67' },
      { key: 'Durability', value: 'Rugged fabric and rubber housing' }
    ]
  },
  {
    id: 'product-2',
    name: 'iPhone 17 Pro',
    brand: 'Apple',
    price: 351600,
    comparePrice: 396000,
    ratings: {
      average: 0,
      count: 0
    },
    specifications: [
      { key: 'Display', value: 'Brighter OLED with 120Hz' },
      { key: 'Performance', value: 'A19 Pro / 3nm' },
      { key: 'Camera', value: '24MP front camera upgrade' },
      { key: 'Battery', value: 'Better battery life' },
      { key: 'Wi-Fi', value: 'Wi-Fi 7' },
      { key: 'Warranty', value: '1 Year Warranty' }
    ]
  }
];

const renderCompare = (): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Compare />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Compare', () => {
  beforeEach(() => {
    mocks.clearCompareMock.mockReset();
    mocks.compareMock.mockReset();
    mocks.toggleCompareMock.mockReset();
    mocks.compareMock.mockResolvedValue({ data: comparisonProducts });
  });

  it('shows the full shared specification set with placeholders for missing values', async () => {
    renderCompare();

    await waitFor(() => {
      expect(mocks.compareMock).toHaveBeenCalledWith(['product-1', 'product-2']);
    });

    expect(await screen.findAllByText('Durability')).not.toHaveLength(0);
    expect(screen.getAllByText('Rugged fabric and rubber housing')).not.toHaveLength(0);
    expect(screen.getAllByText('Display')).not.toHaveLength(0);
    expect(screen.getAllByText('Brighter OLED with 120Hz')).not.toHaveLength(0);
    expect(screen.getAllByText('—')).not.toHaveLength(0);
  });
});
