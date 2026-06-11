import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  deleteCouponMock: vi.fn(),
  updateCouponMock: vi.fn(),
  createCouponMock: vi.fn(),
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
    coupons: vi.fn(),
    deleteCoupon: mocks.deleteCouponMock,
    updateCoupon: mocks.updateCouponMock,
    createCoupon: mocks.createCouponMock
  }
}));

import { Coupons } from './Coupons';

type CouponQueryMockOptions = {
  categories?: Array<Record<string, unknown>>;
  brands?: Array<Record<string, unknown>>;
};

const mockCouponsQueries = (couponItems: Array<Record<string, unknown>>, options: CouponQueryMockOptions = {}): void => {
  mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[1] === 'coupons') {
      return {
        data: {
          data: couponItems
        },
        refetch: mocks.refetchMock
      };
    }

    if (queryKey[1] === 'categories') {
      return {
        data: {
          data: options.categories ?? []
        },
        refetch: vi.fn()
      };
    }

    if (queryKey[1] === 'brands') {
      return {
        data: {
          data: options.brands ?? []
        },
        refetch: vi.fn()
      };
    }

    throw new Error(`Unexpected query key: ${queryKey.join('.')}`);
  });
};

const renderCoupons = (): void => {
  render(
    <>
      <Coupons />
      <Toaster position="top-right" />
    </>
  );
};

describe('Admin Coupons page', () => {
  beforeEach(() => {
    mocks.deleteCouponMock.mockReset();
    mocks.updateCouponMock.mockReset();
    mocks.createCouponMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.deleteCouponMock.mockResolvedValue(undefined);
    mocks.updateCouponMock.mockResolvedValue(undefined);
    mocks.createCouponMock.mockResolvedValue(undefined);
    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.hasPermissionsMock.mockReturnValue(true);
  });

  it('shows a success toast after deactivating a coupon', async () => {
    const user = userEvent.setup();

    mockCouponsQueries([
      {
        _id: 'coupon-active',
        code: 'NEW10',
        type: 'percentage',
        value: 10,
        usageLimit: 100,
        usedCount: 4,
        isActive: true,
        expiryDate: '2026-12-31T00:00:00.000Z'
      }
    ]);

    renderCoupons();

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(mocks.deleteCouponMock).toHaveBeenCalledWith('coupon-active');
    expect(await screen.findByText('Coupon deactivated')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows an API error toast when coupon reactivation fails', async () => {
    const user = userEvent.setup();

    mocks.updateCouponMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Coupon cannot be reactivated'
        }
      }
    });
    mockCouponsQueries([
      {
        _id: 'coupon-inactive',
        code: 'SHIPFREE',
        type: 'free_shipping',
        value: 0,
        usageLimit: 50,
        usedCount: 12,
        isActive: false,
        expiryDate: '2026-12-31T00:00:00.000Z'
      }
    ]);

    renderCoupons();

    await user.click(screen.getByRole('button', { name: 'Reactivate' }));

    expect(await screen.findByText('Coupon cannot be reactivated')).toBeInTheDocument();
    expect(mocks.refetchMock).not.toHaveBeenCalled();
  });

  it('generates a code and submits an email-restricted coupon', async () => {
    const user = userEvent.setup();

    mockCouponsQueries([]);

    renderCoupons();

    await user.click(screen.getByRole('button', { name: 'Add Coupon' }));
    await user.click(screen.getByRole('button', { name: 'Generate Code' }));

    const codeInput = screen.getByLabelText('Code') as HTMLInputElement;
    expect(codeInput.value).toMatch(/^[A-Z0-9]{8}$/);

    await user.type(screen.getByLabelText('Restrict to Email'), 'vip@example.com');
    await user.type(screen.getByLabelText('Expiry Date'), '2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Create Coupon' }));

    expect(mocks.createCouponMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.stringMatching(/^[A-Z0-9]{8}$/),
        restrictToEmail: 'vip@example.com'
      })
    );
    expect(await screen.findByText('Coupon created')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows inactive brand options and targets all selected brands without a nullable BOGO payload', async () => {
    const user = userEvent.setup();

    mockCouponsQueries([], {
      brands: [
        {
          id: 'brand-dell',
          name: 'Dell',
          isActive: false,
          sortOrder: 1
        },
        {
          id: 'brand-apple',
          name: 'Apple',
          isActive: true,
          sortOrder: 2
        }
      ]
    });

    renderCoupons();

    await user.click(screen.getByRole('button', { name: 'Add Coupon' }));

    expect(screen.getByRole('option', { name: 'Dell (inactive)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Select all' })[1]);
    await user.type(screen.getByLabelText('Code'), 'brand10');
    await user.type(screen.getByLabelText('Expiry Date'), '2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Create Coupon' }));

    const payload = mocks.createCouponMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        code: 'BRAND10',
        appliesToBrands: ['brand-dell', 'brand-apple']
      })
    );
    expect(payload).not.toHaveProperty('bogo');
  });

  it('updates standard coupons without sending stale BOGO data', async () => {
    const user = userEvent.setup();

    mockCouponsQueries([
      {
        _id: 'coupon-standard',
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        usageLimit: 100,
        usedCount: 4,
        isActive: true,
        expiryDate: '2026-12-31T00:00:00.000Z'
      }
    ]);

    renderCoupons();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    const payload = mocks.updateCouponMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        code: 'SAVE10',
        type: 'percentage'
      })
    );
    expect(payload).not.toHaveProperty('bogo');
  });
});
