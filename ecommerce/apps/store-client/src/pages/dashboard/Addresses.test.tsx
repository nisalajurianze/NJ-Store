import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addAddressMock: vi.fn(),
  updateAddressMock: vi.fn(),
  deleteAddressMock: vi.fn(),
  setDefaultAddressMock: vi.fn(),
  addresses: [] as Array<{
    _id?: string;
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
  }>
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    addAddress: mocks.addAddressMock,
    addresses: mocks.addresses,
    updateAddress: mocks.updateAddressMock,
    deleteAddress: mocks.deleteAddressMock,
    setDefaultAddress: mocks.setDefaultAddressMock
  })
}));

import { DashboardAddresses } from './Addresses';

describe('DashboardAddresses', () => {
  beforeEach(() => {
    mocks.addAddressMock.mockReset();
    mocks.updateAddressMock.mockReset();
    mocks.deleteAddressMock.mockReset();
    mocks.setDefaultAddressMock.mockReset();
    mocks.addAddressMock.mockResolvedValue(undefined);
    mocks.updateAddressMock.mockResolvedValue(undefined);
    mocks.addresses = [];
  });

  it('shows a success toast after adding a new address', async () => {
    const user = userEvent.setup();

    render(
      <>
        <DashboardAddresses />
        <Toaster position="top-right" />
      </>
    );

    await user.type(screen.getByLabelText('Label'), 'Home');
    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('Phone'), '0771234567');
    await user.type(screen.getByLabelText('Address Line 1'), '123 Main Street');
    await user.type(screen.getByLabelText('City'), 'Colombo');
    await user.type(screen.getByLabelText('District'), 'Colombo');
    await user.type(screen.getByLabelText('Postal Code'), '00100');
    await user.click(screen.getByRole('button', { name: 'Add Address' }));

    expect(mocks.addAddressMock).toHaveBeenCalledWith({
      label: 'Home',
      fullName: 'Test User',
      phone: '0771234567',
      line1: '123 Main Street',
      line2: '',
      city: 'Colombo',
      district: 'Colombo',
      postalCode: '00100',
      country: 'Sri Lanka',
      isDefault: true
    });
    expect(await screen.findByText('Address added')).toBeInTheDocument();
    expect(screen.queryByLabelText('Label')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Address' })).toBeInTheDocument();
  });

  it('shows an API error toast and keeps the form values when saving fails', async () => {
    const user = userEvent.setup();

    mocks.addAddressMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Address validation failed'
        }
      }
    });

    render(
      <>
        <DashboardAddresses />
        <Toaster position="top-right" />
      </>
    );

    await user.type(screen.getByLabelText('Label'), 'Office');
    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('Phone'), '0712345678');
    await user.type(screen.getByLabelText('Address Line 1'), '456 Lake Road');
    await user.type(screen.getByLabelText('City'), 'Kandy');
    await user.type(screen.getByLabelText('District'), 'Kandy');
    await user.type(screen.getByLabelText('Postal Code'), '20000');
    await user.click(screen.getByRole('button', { name: 'Add Address' }));

    expect(await screen.findByText('Address validation failed')).toBeInTheDocument();
    expect(screen.getByLabelText('Label')).toHaveValue('Office');
    expect(screen.getByLabelText('Address Line 1')).toHaveValue('456 Lake Road');
  });

  it('opens an address in edit mode and saves changes through the update action', async () => {
    const user = userEvent.setup();

    mocks.addresses = [
      {
        _id: 'address-1',
        label: 'Home',
        fullName: 'Test User',
        phone: '0771234567',
        line1: '123 Main Street',
        line2: '',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00100',
        country: 'Sri Lanka',
        isDefault: true
      }
    ];

    render(
      <>
        <DashboardAddresses />
        <Toaster position="top-right" />
      </>
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('City'));
    await user.type(screen.getByLabelText('City'), 'Kandy');
    await user.click(screen.getByRole('button', { name: 'Save Address' }));

    expect(mocks.updateAddressMock).toHaveBeenCalledWith('address-1', {
      label: 'Home',
      fullName: 'Test User',
      phone: '0771234567',
      line1: '123 Main Street',
      line2: '',
      city: 'Kandy',
      district: 'Colombo',
      postalCode: '00100',
      country: 'Sri Lanka'
    });
    expect(await screen.findByText('Address updated')).toBeInTheDocument();
  });
});
