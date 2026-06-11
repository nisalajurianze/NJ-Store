import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  registerMock: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    register: mocks.registerMock
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

import { Register } from './Register';

describe('Register page', () => {
  beforeEach(() => {
    mocks.navigateMock.mockReset();
    mocks.registerMock.mockReset();
    mocks.registerMock.mockResolvedValue(undefined);
  });

  it('submits normalized registration details and redirects after success', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/auth/register']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Register />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Full Name'), '  Test Shopper  ');
    await user.type(screen.getByLabelText('Email'), 'SHOPPER@EXAMPLE.COM');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(mocks.registerMock).toHaveBeenCalledWith({
      name: 'Test Shopper',
      email: 'shopper@example.com',
      password: 'Secret123!'
    });
    expect(await screen.findByText('Account created. Check your email to verify your address.')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows the API error in both a toast and the email field when registration fails', async () => {
    const user = userEvent.setup();

    mocks.registerMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Email already exists'
        }
      }
    });

    render(
      <MemoryRouter
        initialEntries={['/auth/register']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Register />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Full Name'), 'Test Shopper');
    await user.type(screen.getByLabelText('Email'), 'shopper@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findAllByText('Email already exists')).toHaveLength(2);
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it('shows a client-side validation message when the passwords do not match', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/auth/register']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Register />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Full Name'), 'Test Shopper');
    await user.type(screen.getByLabelText('Email'), 'shopper@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret123@');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mocks.registerMock).not.toHaveBeenCalled();
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });


  it('updates the live password strength meter as the shopper types', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/auth/register']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Register />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText('Password');

    expect(screen.getAllByText('Start typing').length).toBeGreaterThan(0);

    await user.type(passwordInput, 'abc');
    expect((await screen.findAllByText('Weak')).length).toBeGreaterThan(0);

    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongPass123!');
    expect((await screen.findAllByText('Strong')).length).toBeGreaterThan(0);
  });
});
