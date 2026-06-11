import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  forgotPasswordMock: vi.fn()
}));

vi.mock('../../services/authService', () => ({
  authService: {
    forgotPassword: mocks.forgotPasswordMock
  }
}));

import { ForgotPassword } from './ForgotPassword';

describe('ForgotPassword page', () => {
  beforeEach(() => {
    mocks.forgotPasswordMock.mockReset();
  });

  it('shows an API error toast when the reset email request fails', async () => {
    const user = userEvent.setup();

    mocks.forgotPasswordMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Password reset service is temporarily unavailable'
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
        <ForgotPassword />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email'), 'shopper@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(await screen.findByText('Password reset service is temporarily unavailable')).toBeInTheDocument();
  });

  it('submits the email and clears the form after success', async () => {
    const user = userEvent.setup();

    mocks.forgotPasswordMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ForgotPassword />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email'), 'shopper@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(mocks.forgotPasswordMock).toHaveBeenCalledWith('shopper@example.com');
    expect(await screen.findByText('Reset email sent if the account exists')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('offers a direct route back to login', () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ForgotPassword />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/auth/login');
  });
});
