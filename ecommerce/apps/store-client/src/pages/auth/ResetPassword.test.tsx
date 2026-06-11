import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resetPasswordMock: vi.fn()
}));

vi.mock('../../services/authService', () => ({
  authService: {
    resetPassword: mocks.resetPasswordMock
  }
}));

import { ResetPassword } from './ResetPassword';

describe('ResetPassword page', () => {
  beforeEach(() => {
    mocks.resetPasswordMock.mockReset();
  });

  it('shows an API error toast when the password reset fails', async () => {
    const user = userEvent.setup();

    mocks.resetPasswordMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Reset token is invalid or expired'
        }
      }
    });

    render(
      <MemoryRouter
        initialEntries={['/auth/reset-password?token=reset-token']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ResetPassword />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('New Password'), 'NewSecret123!');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText('Reset token is invalid or expired')).toBeInTheDocument();
  });

  it('submits the token payload and clears the password field after success', async () => {
    const user = userEvent.setup();

    mocks.resetPasswordMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter
        initialEntries={['/auth/reset-password?token=reset-token']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ResetPassword />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('New Password'), 'NewSecret123!');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(mocks.resetPasswordMock).toHaveBeenCalledWith('reset-token', 'NewSecret123!');
    expect(await screen.findByText('Password reset successful')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toHaveValue('');
  });

  it('shows a recovery fallback when the reset token is missing', () => {
    render(
      <MemoryRouter
        initialEntries={['/auth/reset-password']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ResetPassword />
      </MemoryRouter>
    );

    expect(screen.getByText('This reset link is incomplete. Request a fresh email and we will send you a new one.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request reset email' })).toHaveAttribute('href', '/auth/forgot-password');
  });
});
