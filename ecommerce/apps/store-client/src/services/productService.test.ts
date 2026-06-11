import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn()
}));

vi.mock('./api', () => ({
  default: {
    get: mocks.getMock,
    post: mocks.postMock
  }
}));

vi.mock('../utils/browserStorage', () => ({
  readStorageJson: vi.fn(() => []),
  removeStorageItem: vi.fn(),
  writeStorageItem: vi.fn()
}));

import { productService } from './productService';

describe('productService', () => {
  beforeEach(() => {
    mocks.getMock.mockReset();
    mocks.postMock.mockReset();
    mocks.getMock.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          page: 1,
          totalPages: 1,
          total: 0,
          limit: 12
        }
      }
    });
  });

  it('serializes category and brand filters in the server-supported comma format', async () => {
    await productService.list({
      category: ['category-laptops', 'category-accessories'],
      brand: ['acer', 'dell'],
      limit: 12,
      page: 1
    });

    expect(mocks.getMock).toHaveBeenCalledWith('/products', {
      params: {
        category: 'category-laptops,category-accessories',
        brand: 'acer,dell',
        limit: 12,
        page: 1
      }
    });
  });
});
