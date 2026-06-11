import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    BrowserRouter: ({ children }: PropsWithChildren) => (
      <actual.MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        {children}
      </actual.MemoryRouter>
    )
  };
});

vi.mock('./context/AdminAuthContext', () => ({
  AdminAuthProvider: ({ children }: PropsWithChildren) => <>{children}</>
}));

vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null
}));

vi.mock('./app/router', async () => {
  const { default: toast } = await vi.importActual<typeof import('react-hot-toast')>('react-hot-toast');

  return {
    AppRouter: () => (
      <button type="button" onClick={() => toast.success('Admin toast ready')}>
        Trigger admin toast
      </button>
    )
  };
});

import { App } from './App';

describe('Admin app shell', () => {
  it('mounts the lazy toast viewport and renders a toast from the router tree', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Trigger admin toast' }));

    expect(await screen.findByText('Admin toast ready')).toBeInTheDocument();
  });
});
