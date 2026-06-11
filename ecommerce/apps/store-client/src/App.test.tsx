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

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useAuth: () => ({
    user: null
  })
}));

vi.mock('./context/CartContext', () => ({
  CartProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useCart: () => ({
    cart: { items: [] },
    addItem: vi.fn(),
    clearCart: vi.fn(),
    dismissRecentlyAddedItem: vi.fn(),
    loadCart: vi.fn(),
    loading: false,
    recentlyAddedItem: null,
    removeItem: vi.fn(),
    updateItem: vi.fn()
  })
}));

vi.mock('./context/CompareContext', () => ({
  CompareProvider: ({ children }: PropsWithChildren) => <>{children}</>
}));

vi.mock('./context/ThemeContext', () => ({
  ThemeProvider: ({ children }: PropsWithChildren) => <>{children}</>
}));

vi.mock('./context/CurrencyContext', () => ({
  CurrencyProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useCurrency: () => ({
    activeCurrency: {
      code: 'LKR',
      name: 'Sri Lankan Rupee',
      symbol: 'LKR',
      rate: 1,
      isDefault: true
    },
    supportedCurrencies: [
      {
        code: 'LKR',
        name: 'Sri Lankan Rupee',
        symbol: 'LKR',
        rate: 1,
        isDefault: true
      }
    ],
    setCurrency: vi.fn()
  })
}));

vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null
}));

vi.mock('./app/router', async () => {
  const { toast } = await vi.importActual<typeof import('./utils/lazyToast')>('./utils/lazyToast');

  return {
    AppRouter: () => (
      <button type="button" onClick={() => toast.success('Store toast ready')}>
        Trigger store toast
      </button>
    )
  };
});

import { App } from './App';

describe('Store app shell', () => {
  it('mounts the lazy toast viewport and renders a toast from the router tree', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Trigger store toast' }));

    expect(await screen.findByText('Store toast ready')).toBeInTheDocument();
  });
});
