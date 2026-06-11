import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginMock: vi.fn(),
  googleLoginMock: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mocks.loginMock,
    googleLogin: mocks.googleLoginMock
  })
}));

import { Login } from './Login';

describe('Store login page', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    mocks.loginMock.mockReset();
    mocks.googleLoginMock.mockReset();
    mocks.loginMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows a success toast after a successful sign-in submit', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/auth/login']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Login />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email'), 'SHOPPER@EXAMPLE.COM');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(mocks.loginMock).toHaveBeenCalledWith({
      email: 'shopper@example.com',
      password: 'Secret123',
      rememberMe: false
    });
  });

  it('passes remember-me preference through the login submit payload', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/auth/login']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Login />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email'), 'shopper@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.click(screen.getByLabelText('Remember me on this device'));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(mocks.loginMock).toHaveBeenCalledWith({
      email: 'shopper@example.com',
      password: 'Secret123',
      rememberMe: true
    });
  });

  it('shows the API error in both a toast and the password field when sign-in fails', async () => {
    const user = userEvent.setup();

    mocks.loginMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Incorrect email or password'
        }
      }
    });

    render(
      <MemoryRouter
        initialEntries={['/auth/login']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Login />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email'), 'shopper@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findAllByText('Incorrect email or password')).toHaveLength(2);
  });

  it('keeps the forgot-password link visible inside the login form', () => {
    render(
      <MemoryRouter
        initialEntries={['/auth/login']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument();
  });
});
