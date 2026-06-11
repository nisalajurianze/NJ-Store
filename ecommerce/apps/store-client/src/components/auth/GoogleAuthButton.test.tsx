import { act, render, screen, waitFor } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleCredentialResponse, GoogleIdConfiguration } from '../../utils/googleIdentity';

const mocks = vi.hoisted(() => ({
  googleLoginMock: vi.fn(),
  navigateMock: vi.fn(),
  initializeMock: vi.fn(),
  renderButtonMock: vi.fn(),
  promptMock: vi.fn(),
  cancelMock: vi.fn(),
  disableAutoSelectMock: vi.fn()
}));

let capturedCallback: ((response: GoogleCredentialResponse) => void) | null = null;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    googleLogin: mocks.googleLoginMock
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

import { GoogleAuthButton } from './GoogleAuthButton';

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'google-client-id');
    vi.stubEnv('VITE_ENABLE_GOOGLE_AUTH', 'true');
    capturedCallback = null;
    mocks.googleLoginMock.mockReset();
    mocks.googleLoginMock.mockResolvedValue(undefined);
    mocks.navigateMock.mockReset();
    mocks.initializeMock.mockReset();
    mocks.renderButtonMock.mockReset();
    mocks.promptMock.mockReset();
    mocks.cancelMock.mockReset();
    mocks.disableAutoSelectMock.mockReset();

    mocks.initializeMock.mockImplementation((options: GoogleIdConfiguration) => {
      capturedCallback = options.callback;
    });

    window.google = {
      accounts: {
        id: {
          initialize: mocks.initializeMock,
          renderButton: mocks.renderButtonMock,
          prompt: mocks.promptMock,
          cancel: mocks.cancelMock,
          disableAutoSelect: mocks.disableAutoSelectMock
        }
      }
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.google;
  });

  it('shows a visible setup message when the storefront Google client ID is missing', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <GoogleAuthButton />
      </MemoryRouter>
    );

    expect(screen.getByText('Google sign-in setup needed')).toBeInTheDocument();
    expect(screen.getAllByText(/VITE_GOOGLE_CLIENT_ID/).length).toBeGreaterThan(0);
  });

  it('pauses Google Identity locally until the storefront explicitly opts in', () => {
    vi.stubEnv('VITE_ENABLE_GOOGLE_AUTH', '');

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <GoogleAuthButton />
      </MemoryRouter>
    );

    expect(screen.getByText('Google sign-in setup needed')).toBeInTheDocument();
    expect(screen.getByText(/paused on localhost/i)).toBeInTheDocument();
    expect(screen.getAllByText(/VITE_ENABLE_GOOGLE_AUTH/).length).toBeGreaterThan(0);
    expect(mocks.initializeMock).not.toHaveBeenCalled();
  });

  it('initializes Google Identity and renders the button without One Tap prompts', async () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <GoogleAuthButton rememberMe context="signup" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mocks.initializeMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.initializeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'google-client-id',
        auto_select: false,
        button_auto_select: false,
        context: 'signup',
        itp_support: true
      })
    );
    expect(mocks.renderButtonMock).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        locale: 'en',
        text: 'signup_with'
      })
    );
    expect(mocks.renderButtonMock.mock.calls[0]?.[0]).toHaveClass('overflow-hidden', 'rounded-full', 'bg-white');
    expect(mocks.promptMock).not.toHaveBeenCalled();
  });

  it('submits the Google credential with remember-me and redirects after success', async () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <GoogleAuthButton rememberMe />
        <Toaster position="top-right" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    await act(async () => {
      await capturedCallback?.({ credential: 'google-jwt-token' });
    });

    expect(mocks.googleLoginMock).toHaveBeenCalledWith({
      credential: 'google-jwt-token',
      rememberMe: true
    });
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard');
  });
});
