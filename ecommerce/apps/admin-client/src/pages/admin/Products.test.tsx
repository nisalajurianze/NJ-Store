import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProductMock: vi.fn(),
  deleteProductMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  permanentlyDeleteProductMock: vi.fn(),
  refetchMock: vi.fn(),
  restoreProductVersionMock: vi.fn(),
  bulkAdjustProductPricesMock: vi.fn(),
  productVersionsMock: vi.fn(),
  uploadProductImagesMock: vi.fn(),
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
    brands: vi.fn(),
    categories: vi.fn(),
    createProduct: mocks.createProductMock,
    bulkAdjustProductPrices: mocks.bulkAdjustProductPricesMock,
    updateProduct: mocks.updateProductMock,
    uploadProductImages: mocks.uploadProductImagesMock,
    deleteProduct: mocks.deleteProductMock,
    permanentlyDeleteProduct: mocks.permanentlyDeleteProductMock,
    productVersions: mocks.productVersionsMock,
    restoreProductVersion: mocks.restoreProductVersionMock
  }
}));

import { Products } from './Products';

const createProductRecord = (overrides: Record<string, unknown> = {}) => ({
  _id: 'product-1',
  name: 'Laptop Pro',
  brand: 'NJ',
  brandId: 'brand-nj',
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

const createVersionRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'version-2',
  version: 2,
  commitMessage: 'Raised product price',
  createdAt: new Date('2026-04-08T10:00:00.000Z').toISOString(),
  updatedBy: {
    id: 'admin-1',
    name: 'Admin User'
  },
  snapshot: {
    name: 'Laptop Pro',
    shortDescription: 'Reliable laptop for work and study.',
    description: 'Fast work laptop with strong battery life.',
    price: 3000,
    comparePrice: 3500,
    category: 'cat-laptops',
    categoryName: 'Laptops',
    brand: 'brand-nj',
    brandName: 'NJ',
    sku: 'LAP-PRO',
    loyaltyPoints: 25,
    isActive: true,
    isBestSeller: false,
    isFeatured: false,
    isFlashDeal: false,
    tags: ['work'],
    images: [
      {
        url: 'https://example.com/laptop-pro.jpg',
        publicId: 'products/laptop-pro',
        alt: 'Laptop Pro'
      }
    ],
    variants: [{ stock: 8, sku: 'LAP-PRO-1' }],
    specifications: [{ key: 'CPU', value: 'Ultra 7' }]
  },
  ...overrides
});

const mockProductsQuery = (products: Array<Record<string, unknown>>, versions: Array<Record<string, unknown>> = []): void => {
  mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[1] === 'products') {
      return {
        data: {
          data: products
        },
        refetch: mocks.refetchMock
      };
    }

    if (queryKey[1] === 'categories') {
      return {
        data: {
          data: [
            {
              id: 'cat-laptops',
              name: 'Laptops',
              children: []
            }
          ]
        },
        refetch: vi.fn()
      };
    }

    if (queryKey[1] === 'brands') {
      return {
        data: {
          data: [
            {
              id: 'brand-nj',
              name: 'NJ',
              slug: 'nj',
              isActive: true,
              sortOrder: 1
            }
          ]
        },
        refetch: vi.fn()
      };
    }

    if (queryKey[1] === 'product-versions') {
      return {
        data: versions,
        isLoading: false,
        refetch: mocks.refetchMock
      };
    }

    throw new Error(`Unexpected query key: ${queryKey.join('.')}`);
  });
};

const renderProducts = (route = '/dashboard/products'): void => {
  render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <>
        <Products />
        <Toaster position="top-right" />
      </>
    </MemoryRouter>
  );
};

describe('Admin Products page', () => {
  beforeEach(() => {
    mocks.createProductMock.mockReset();
    mocks.deleteProductMock.mockReset();
    mocks.hasPermissionsMock.mockReset();
    mocks.permanentlyDeleteProductMock.mockReset();
    mocks.bulkAdjustProductPricesMock.mockReset();
    mocks.productVersionsMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.restoreProductVersionMock.mockReset();
    mocks.uploadProductImagesMock.mockReset();
    mocks.updateProductMock.mockReset();
    mocks.bulkAdjustProductPricesMock.mockResolvedValue({ data: { updatedCount: 0, flashDealsDisabledCount: 0 } });
    mocks.deleteProductMock.mockResolvedValue(undefined);
    mocks.hasPermissionsMock.mockImplementation(() => true);
    mocks.permanentlyDeleteProductMock.mockResolvedValue(undefined);
    mocks.productVersionsMock.mockResolvedValue({ data: [] });
    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.restoreProductVersionMock.mockResolvedValue(undefined);
    mocks.uploadProductImagesMock.mockResolvedValue({ data: [] });
    mocks.updateProductMock.mockResolvedValue(undefined);
    mockProductsQuery([]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows the API error toast when product creation fails', async () => {
    const user = userEvent.setup();

    mocks.createProductMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Product SKU already exists'
        }
      }
    });

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Add Product' }));
    fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Laptop Pro' } });
    await user.selectOptions(screen.getByLabelText('Brand'), 'brand-nj');
    await user.selectOptions(screen.getByLabelText('Category'), 'cat-laptops');
    fireEvent.change(screen.getByLabelText('Master SKU'), { target: { value: 'LAP-PRO' } });
    fireEvent.change(screen.getByLabelText('Short Description'), { target: { value: 'Reliable laptop.' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Fast work laptop.' } });
    await user.click(screen.getByRole('button', { name: /Pricing/ }));
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '2450' } });
    fireEvent.change(screen.getByLabelText('Loyalty Points'), { target: { value: '25' } });
    await user.click(screen.getByRole('button', { name: /Images/ }));
    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://example.com/laptop-pro.jpg' } });
    fireEvent.change(screen.getByLabelText('Cloudinary Public ID'), { target: { value: 'products/laptop-pro' } });
    await user.click(screen.getByRole('button', { name: /Variants/ }));
    fireEvent.change(screen.getByLabelText('Variant SKU'), { target: { value: 'LAP-PRO-1' } });
    fireEvent.change(screen.getByLabelText('Stock'), { target: { value: '8' } });
    await user.click(screen.getByRole('button', { name: /Specs/ }));
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'CPU' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'Ultra 7' } });
    await user.click(screen.getByRole('button', { name: 'Create Product' }));

    expect(await screen.findByText('Product SKU already exists')).toBeInTheDocument();
    expect(mocks.refetchMock).not.toHaveBeenCalled();
  }, 10000);

  it('saves edits when the product uses a relative canonical URL', async () => {
    const user = userEvent.setup();

    mockProductsQuery([
      createProductRecord({
        canonicalUrl: '/product/laptop-pro'
      })
    ]);

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Laptop Pro Max' } });
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        name: 'Laptop Pro Max',
        canonicalUrl: '/product/laptop-pro'
      })
    );
    expect(await screen.findByText('Product updated')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears optional product fields when editing and saving', async () => {
    const user = userEvent.setup();

    mockProductsQuery([
      createProductRecord({
        comparePrice: 2999,
        canonicalUrl: 'https://njstore.lk/product/laptop-pro',
        warranty: '1 year warranty'
      })
    ]);

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: /SEO/ }));
    await user.clear(screen.getByLabelText('Canonical URL'));
    await user.clear(screen.getByLabelText('Warranty'));
    await user.click(screen.getByRole('button', { name: /Pricing/ }));
    await user.clear(screen.getByLabelText('Compare Price'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        comparePrice: null,
        canonicalUrl: null,
        warranty: null
      })
    );
    expect((await screen.findAllByText('Product updated')).length).toBeGreaterThan(0);
  });

  it('shows read-only access when the admin lacks product permissions', () => {
    mocks.hasPermissionsMock.mockReturnValue(false);
    mockProductsQuery([createProductRecord()]);

    renderProducts();

    expect(screen.queryByRole('button', { name: 'Add Product' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.getByText('Read Only')).toBeInTheDocument();
    expect(screen.getByText('Read-only access')).toBeInTheDocument();
  });

  it('shows a success toast after deactivating an active product', async () => {
    const user = userEvent.setup();

    mockProductsQuery([createProductRecord()]);

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Deactivate "Laptop Pro"? It will disappear from the active list but can still be restored.'
    );
    expect(mocks.deleteProductMock).toHaveBeenCalledWith('product-1');
    expect(await screen.findByText('Product deactivated. Inactive items are now visible.')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the API error toast when restoring an inactive product fails', async () => {
    const user = userEvent.setup();

    mocks.updateProductMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Product cannot be restored yet'
        }
      }
    });
    mockProductsQuery([
      createProductRecord({
        _id: 'product-inactive',
        isActive: false
      })
    ]);

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Show Inactive' }));
    await user.click(screen.getByRole('button', { name: 'Restore' }));

    expect(mocks.updateProductMock).toHaveBeenCalledWith('product-inactive', { isActive: true });
    expect(await screen.findByText('Product cannot be restored yet')).toBeInTheDocument();
    expect(mocks.refetchMock).not.toHaveBeenCalled();
  });

  it('keeps product search separate from the inventory low-stock workspace', () => {
    mockProductsQuery([
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

    renderProducts('/dashboard/products?inventory=low_stock');

    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Mouse Lite')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show All Stock' })).not.toBeInTheDocument();
    expect(screen.getByText('Inventory moved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inventory' })).not.toBeInTheDocument();
  });

  it('opens the matching product editor from the edit query string', () => {
    mockProductsQuery([
      createProductRecord({
        _id: 'product-low-stock',
        name: 'Mouse Lite',
        sku: 'MOUSE-LITE',
        variants: [{ stock: 2, sku: 'MOUSE-LITE-1' }]
      })
    ]);

    renderProducts('/dashboard/products?view=all&edit=product-low-stock');

    expect(screen.getByText('Edit Product')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mouse Lite')).toBeInTheDocument();
  });

  it('shows a success toast after permanently deleting an inactive product', async () => {
    const user = userEvent.setup();

    mockProductsQuery([
      createProductRecord({
        _id: 'product-inactive',
        isActive: false
      })
    ]);

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Show Inactive' }));
    await user.click(screen.getByRole('button', { name: 'Delete Permanently' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Permanently delete "Laptop Pro"? This cannot be undone. If the product is linked to orders or reviews, deletion will be blocked.'
    );
    expect(mocks.permanentlyDeleteProductMock).toHaveBeenCalledWith('product-inactive');
    expect(await screen.findByText('Product deleted permanently')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not render product selection or bulk price controls', () => {
    mockProductsQuery([createProductRecord()]);

    renderProducts();

    expect(screen.queryByRole('button', { name: /Select Page/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear Selection/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bulk Price Update/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Select Laptop Pro' })).not.toBeInTheDocument();
  });

  it('opens version history and restores the selected version', async () => {
    const user = userEvent.setup();

    mockProductsQuery(
      [createProductRecord()],
      [
        createVersionRecord(),
        createVersionRecord({
          id: 'version-1',
          version: 1,
          commitMessage: 'Created product',
          createdAt: new Date('2026-04-07T10:00:00.000Z').toISOString(),
          snapshot: {
            ...createVersionRecord().snapshot,
            price: 2450,
            comparePrice: undefined
          }
        })
      ]
    );

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByText('Version History - Laptop Pro')).toBeInTheDocument();
    expect(screen.getAllByText('Raised product price').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Restore This Version' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Restore "Laptop Pro" to version 2? The current live state will be saved as a newer version.'
    );
    expect(mocks.restoreProductVersionMock).toHaveBeenCalledWith('product-1', 'version-2');
    expect(await screen.findByText('Restored Laptop Pro to version 2')).toBeInTheDocument();
  });

  it('uploads variant gallery images into the editor form', async () => {
    const user = userEvent.setup();

    mocks.uploadProductImagesMock.mockResolvedValue({
      data: [
        {
          url: 'https://example.com/laptop-pro-blue.jpg',
          publicId: 'products/laptop-pro-blue',
          alt: 'Laptop Pro blue front'
        }
      ]
    });
    mockProductsQuery([createProductRecord()]);

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: /Variants/ }));

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const variantUploadInput = fileInputs[fileInputs.length - 1] as HTMLInputElement;

    await user.upload(
      variantUploadInput,
      new File(['variant-image'], 'laptop-pro-blue.jpg', {
        type: 'image/jpeg'
      })
    );

    expect(mocks.uploadProductImagesMock).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('https://example.com/laptop-pro-blue.jpg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('products/laptop-pro-blue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Laptop Pro blue front')).toBeInTheDocument();
  });

  it('keeps existing variants when toggling offer type before saving', async () => {
    const user = userEvent.setup();

    mockProductsQuery([createProductRecord()]);

    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const offerTypeSelect = screen.getByText('Offer Type').closest('label')?.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(offerTypeSelect, 'bundle');
    await user.click(screen.getByRole('button', { name: /Bundle/ }));

    expect(screen.getByText('Bundle Item 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Details/ }));
    const restoredOfferTypeSelect = screen.getByText('Offer Type').closest('label')?.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(restoredOfferTypeSelect, 'standard');
    await user.click(screen.getByRole('button', { name: /Variants/ }));

    expect(screen.getByDisplayValue('LAP-PRO-1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        productType: 'standard',
        variants: [expect.objectContaining({ sku: 'LAP-PRO-1' })]
      })
    );
  });
});
