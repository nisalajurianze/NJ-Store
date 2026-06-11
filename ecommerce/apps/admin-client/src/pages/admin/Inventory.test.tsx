import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  hasPermissionsMock: vi.fn(),
  refetchMock: vi.fn(),
  updateProductMock: vi.fn(),
  useQueryMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock
}));

vi.mock('../../hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    hasPermissions: mocks.hasPermissionsMock
  })
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    products: vi.fn(),
    updateProduct: mocks.updateProductMock
  }
}));

import { Inventory } from './Inventory';

const createProductRecord = (overrides: Record<string, unknown> = {}) => ({
  _id: 'product-1',
  name: 'Laptop Pro',
  brand: 'NJ',
  price: 2450,
  shortDescription: 'Reliable laptop for work and study.',
  description: 'Fast work laptop with strong battery life.',
  category: {
    id: 'cat-laptops',
    name: 'Laptops'
  },
  isActive: true,
  isBestSeller: false,
  isFeatured: false,
  productType: 'standard',
  variants: [
    {
      stock: 8,
      sku: 'LAP-PRO-1'
    }
  ],
  specifications: [
    {
      key: 'CPU',
      value: 'Ultra 7'
    }
  ],
  images: [
    {
      url: 'https://example.com/laptop-pro.jpg',
      publicId: 'products/laptop-pro',
      alt: 'Laptop Pro'
    }
  ],
  loyaltyPoints: 25,
  sku: 'LAP-PRO',
  ...overrides
});

const mockInventoryProducts = (products: Array<ReturnType<typeof createProductRecord>>) => {
  mocks.useQueryMock.mockReturnValue({
    isLoading: false,
    isError: false,
    error: null,
    refetch: mocks.refetchMock,
    data: {
      data: products,
      pagination: {
        page: 1,
        limit: 50,
        total: products.length,
        totalPages: 1
      }
    }
  });
};

const renderInventory = (route = '/dashboard/inventory') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Inventory />
    </MemoryRouter>
  );

describe('Admin Inventory page', () => {
  beforeEach(() => {
    mocks.hasPermissionsMock.mockReturnValue(true);
    mocks.refetchMock.mockReset();
    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.updateProductMock.mockReset();
    mocks.updateProductMock.mockResolvedValue(undefined);
    mocks.useQueryMock.mockReset();
  });

  it('filters to low-stock rows and quick-restocks a variant', async () => {
    const user = userEvent.setup();
    mockInventoryProducts([
      createProductRecord({
        _id: 'product-healthy',
        name: 'Laptop Pro',
        variants: [{ stock: 8, sku: 'LAP-PRO-1' }]
      }),
      createProductRecord({
        _id: 'product-low-stock',
        name: 'Mouse Lite',
        sku: 'MOUSE-LITE',
        variants: [{ stock: 2, sku: 'MOUSE-LITE-1' }]
      })
    ]);

    renderInventory('/dashboard/inventory?filter=low_stock');

    expect(screen.queryByText('Laptop Pro')).not.toBeInTheDocument();
    expect(screen.getByText('Mouse Lite')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /5/i }));

    await waitFor(() => {
      expect(mocks.updateProductMock).toHaveBeenCalledWith('product-low-stock', {
        variants: [{ stock: 7, sku: 'MOUSE-LITE-1' }]
      });
    });
  });

  it('sets stock with the explicit stock prompt', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('11');
    mockInventoryProducts([
      createProductRecord({
        _id: 'product-low-stock',
        name: 'Mouse Lite',
        variants: [{ stock: 2, sku: 'MOUSE-LITE-1' }]
      })
    ]);

    renderInventory('/dashboard/inventory?filter=low_stock');

    await user.click(screen.getByRole('button', { name: 'Set stock' }));

    await waitFor(() => {
      expect(mocks.updateProductMock).toHaveBeenCalledWith('product-low-stock', {
        variants: [{ stock: 11, sku: 'MOUSE-LITE-1' }]
      });
    });

    promptSpy.mockRestore();
  });

  it('restores inactive products from the inventory workspace', async () => {
    const user = userEvent.setup();
    mockInventoryProducts([
      createProductRecord({
        _id: 'product-inactive',
        name: 'Retired Tablet',
        isActive: false,
        variants: [{ stock: 3, sku: 'TAB-RET-1' }]
      })
    ]);

    renderInventory('/dashboard/inventory?filter=inactive');

    await user.click(screen.getByRole('button', { name: /Restore/i }));

    await waitFor(() => {
      expect(mocks.updateProductMock).toHaveBeenCalledWith('product-inactive', { isActive: true });
    });
  });
});
