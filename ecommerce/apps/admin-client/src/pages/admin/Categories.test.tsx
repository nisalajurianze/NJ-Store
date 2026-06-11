import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  updateCategoryMock: vi.fn(),
  createCategoryMock: vi.fn(),
  deleteCategoryMock: vi.fn(),
  permanentlyDeleteCategoryMock: vi.fn(),
  uploadCategoryImageMock: vi.fn(),
  refetchMock: vi.fn()
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
    categories: vi.fn(),
    updateCategory: mocks.updateCategoryMock,
    createCategory: mocks.createCategoryMock,
    deleteCategory: mocks.deleteCategoryMock,
    permanentlyDeleteCategory: mocks.permanentlyDeleteCategoryMock,
    uploadCategoryImage: mocks.uploadCategoryImageMock
  }
}));

import { Categories } from './Categories';

describe('Admin Categories page', () => {
  beforeEach(() => {
    mocks.updateCategoryMock.mockReset();
    mocks.createCategoryMock.mockReset();
    mocks.deleteCategoryMock.mockReset();
    mocks.permanentlyDeleteCategoryMock.mockReset();
    mocks.uploadCategoryImageMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.updateCategoryMock.mockResolvedValue(undefined);
    mocks.createCategoryMock.mockResolvedValue(undefined);
    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.hasPermissionsMock.mockReturnValue(true);
    mocks.useQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'cat-phones',
            name: 'Phones',
            slug: 'phones',
            description: 'Smartphones',
            isActive: true,
            order: 0,
            productCount: 5,
            metaTitle: 'Phones | NJ Store',
            children: [
              {
                id: 'cat-cases',
                name: 'Cases',
                slug: 'cases',
                description: 'Phone cases',
                parent: 'cat-phones',
                isActive: true,
                order: 0,
                productCount: 2
              },
              {
                id: 'cat-chargers',
                name: 'Chargers',
                slug: 'chargers',
                description: 'Phone chargers',
                parent: 'cat-phones',
                isActive: true,
                order: 1,
                productCount: 3
              }
            ]
          }
        ]
      },
      refetch: mocks.refetchMock
    });
  });

  it('shows an API error toast when category creation fails', async () => {
    const user = userEvent.setup();

    mocks.createCategoryMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Category name already exists'
        }
      }
    });

    render(
      <>
        <Categories />
        <Toaster position="top-right" />
      </>
    );

    await user.click(screen.getByRole('button', { name: 'Add Category' }));
    await user.type(screen.getByLabelText('Name'), 'Accessories');
    await user.click(screen.getByRole('button', { name: 'Create Category' }));

    expect(await screen.findByText('Category name already exists')).toBeInTheDocument();
    expect(mocks.refetchMock).not.toHaveBeenCalled();
  });

  it('renders nested category context in the list', () => {
    render(<Categories />);

    expect(screen.getAllByText('Path Phones')).toHaveLength(2);
    expect(screen.getAllByText('Nested 1 level deep')).toHaveLength(2);
    expect(screen.getByText('SEO Ready')).toBeInTheDocument();
  });

  it('submits SEO metadata when creating a category', async () => {
    const user = userEvent.setup();

    render(<Categories />);

    await user.click(screen.getByRole('button', { name: 'Add Category' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Accessories' } });
    fireEvent.change(screen.getByLabelText('SEO Title (max 60 chars)'), { target: { value: 'Accessories | NJ Store' } });
    fireEvent.change(screen.getByLabelText('Meta Description (max 160 chars)'), {
      target: { value: 'Chargers, cables, and everyday mobile accessories.' }
    });
    await user.click(screen.getByRole('button', { name: 'Create Category' }));

    await waitFor(() => {
      expect(mocks.createCategoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Accessories',
          description: '',
          metaTitle: 'Accessories | NJ Store',
          metaDescription: 'Chargers, cables, and everyday mobile accessories.',
          order: 0,
          parent: null,
          isActive: true
        })
      );
    });
    await waitFor(() => {
      expect(mocks.refetchMock).toHaveBeenCalled();
    });
  });

  it('persists sibling reordering when a category is dragged within its branch', async () => {
    render(<Categories />);

    const dragHandle = screen.getByRole('button', { name: 'Drag Cases' });
    const targetRow = screen.getByTestId('category-row-cat-chargers');
    const dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn()
    };

    vi.spyOn(targetRow, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 40,
      width: 400,
      height: 40,
      toJSON: () => ({})
    } as DOMRect);

    fireEvent.dragStart(dragHandle, { dataTransfer });
    fireEvent.dragOver(targetRow, { dataTransfer, clientY: 35 });
    fireEvent.drop(targetRow, { dataTransfer, clientY: 35 });

    await waitFor(() => {
      expect(mocks.updateCategoryMock).toHaveBeenCalledWith('cat-chargers', { order: 0 });
      expect(mocks.updateCategoryMock).toHaveBeenCalledWith('cat-cases', { order: 1 });
    });
    expect(mocks.refetchMock).toHaveBeenCalled();
  });
});
