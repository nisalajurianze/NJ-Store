import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginMock: vi.fn()
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    login: mocks.loginMock
  })
}));

import { Login } from './Login';

describe('Admin login page', () => {
  beforeEach(() => {
    mocks.loginMock.mockReset();
    mocks.loginMock.mockResolvedValue(undefined);
  });

  it('shows a success toast after a successful sign-in submit', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Login />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.clear(emailInput);
    await user.type(emailInput, 'ADMIN@NJSTORE.COM');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'Admin@123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(mocks.loginMock).toHaveBeenCalledWith({
      email: 'admin@njstore.com',
      password: 'Admin@123'
    });
  });

  it('shows the API error in both a toast and the password field when sign-in fails', async () => {
    const user = userEvent.setup();

    mocks.loginMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Invalid admin credentials'
        }
      }
    });

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Login />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'admin@njstore.com');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findAllByText('Invalid admin credentials')).toHaveLength(2);
  });
});
