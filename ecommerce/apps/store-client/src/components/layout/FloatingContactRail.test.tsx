import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingContactRail } from './FloatingContactRail';

const mocks = vi.hoisted(() => ({
  siteConfigGetMock: vi.fn()
}));

vi.mock('../../services/siteConfigService', () => ({
  siteConfigService: {
    get: mocks.siteConfigGetMock
  }
}));

const renderRail = (): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <FloatingContactRail />
    </QueryClientProvider>
  );
};

describe('FloatingContactRail', () => {
  beforeEach(() => {
    mocks.siteConfigGetMock.mockReset();
    mocks.siteConfigGetMock.mockResolvedValue({
      supportPhoneNumber: '+94 11 245 8899',
      whatsappNumber: '94112458899'
    });
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 240
    });
    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => {
        Object.defineProperty(window, 'scrollY', {
          writable: true,
          configurable: true,
          value: 0
        });
      })
    });
  });

  it('opens the stacked actions in place without scrolling the page and closes again', async () => {
    const user = userEvent.setup();

    renderRail();

    await user.click(screen.getByRole('button', { name: 'Open contact actions' }));

    expect(window.scrollTo).not.toHaveBeenCalled();

    const callLink = await screen.findByRole('link', { name: 'Call NJ Store (+94 11 245 8899)' });
    const whatsappLink = screen.getByRole('link', { name: 'WhatsApp' });
    const closeButton = screen.getByRole('button', { name: 'Close' });

    expect(callLink).toHaveAttribute('href', 'tel:+94112458899');
    expect(whatsappLink).toHaveAttribute(
      'href',
      'https://wa.me/94112458899?text=Hi%20NJ%20Store%2C%20I%20need%20some%20help%20with%20my%20order.'
    );
    expect(whatsappLink).toHaveAttribute('target', '_blank');

    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Call NJ Store (+94 11 245 8899)' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Open contact actions' })).toBeInTheDocument();
  });
});
