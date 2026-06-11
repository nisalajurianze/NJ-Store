import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendMock: vi.fn()
}));

vi.mock('../../services/contactService', () => ({
  contactService: {
    send: mocks.sendMock
  }
}));

import { Contact } from './Contact';

describe('Contact page', () => {
  beforeEach(() => {
    mocks.sendMock.mockReset();
  });

  it(
    'shows an API error toast when the contact message fails to send',
    async () => {
      const user = userEvent.setup();

      mocks.sendMock.mockRejectedValue({
        isAxiosError: true,
        response: {
          data: {
            message: 'Message delivery failed'
          }
        }
      });

      render(
        <>
          <Contact />
          <Toaster position="top-right" />
        </>
      );

      await user.type(screen.getByLabelText('Name'), 'Test User');
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Message'), 'I need help with a quotation for office equipment.');
      await user.click(screen.getByRole('button', { name: 'Send Message' }));

      expect(await screen.findByText('Message delivery failed')).toBeInTheDocument();
    },
    10_000
  );

  it(
    'resets the contact form after a successful message',
    async () => {
      const user = userEvent.setup();

      mocks.sendMock.mockResolvedValue(undefined);

      render(
        <>
          <Contact />
          <Toaster position="top-right" />
        </>
      );

      await user.type(screen.getByLabelText('Name'), 'Test User');
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Message'), 'I need help with a quotation for office equipment.');
      await user.click(screen.getByRole('button', { name: 'Send Message' }));

      expect(mocks.sendMock).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        message: 'I need help with a quotation for office equipment.'
      });
      expect(await screen.findByText('Message sent successfully')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('');
      expect(screen.getByLabelText('Email')).toHaveValue('');
      expect(screen.getByLabelText('Message')).toHaveValue('');
    },
    10_000
  );

  it('builds a safe address-based map embed URL when footer settings contain an unsafe URL', () => {
    render(<Contact />);

    expect(screen.getByTitle('NJ Store location')).toHaveAttribute(
      'src',
      'https://www.google.com/maps?q=120+Galle+Road%2C+Colombo+03%2C+Sri+Lanka&output=embed'
    );
  });

  it('keeps the hero transparent and fixed panels readable in light mode', () => {
    document.documentElement.dataset.theme = 'light';

    render(<Contact />);

    expect(screen.getByRole('heading', { name: "Let's start the conversation." }).closest('section')).toHaveClass('static-page-hero');
    expect(screen.getByRole('heading', { name: "Let's start the conversation." }).closest('section')).not.toHaveClass('theme-hero-surface');
    expect(screen.getByText(/Tell us what you're shopping for/).closest('div')).toHaveClass('bg-dark-light/70', 'rounded-[20px]');
    expect(screen.getByText('support@njstore.com').closest('a')).toHaveClass('bg-dark-light/80', 'rounded-[20px]');
    expect(screen.getByText(/Tell us what you're shopping for/).closest('div')).not.toHaveClass('theme-dark-surface');
  });
});
