import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal.js';

beforeAll(() => {
  if (typeof window.matchMedia === 'function') {
    return;
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

describe('Modal', () => {
  it('closes when the backdrop wrapper is pressed outside the modal content', () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen title="Categories" onClose={onClose}>
        <p>Browse categories</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Categories' });
    const backdropWrapper = dialog.firstElementChild;

    expect(backdropWrapper).not.toBeNull();

    fireEvent.pointerDown(backdropWrapper as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('can open from an origin trigger without collapsing back into it on close', async () => {
    const user = userEvent.setup();
    const getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: 120,
          y: 96,
          left: 120,
          top: 96,
          right: 880,
          bottom: 516,
          width: 760,
          height: 420,
          toJSON: () => ({})
        }) as DOMRect
    );

    const Example = (): JSX.Element => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <Modal
          isOpen={isOpen}
          title="Categories"
          onClose={() => setIsOpen(false)}
          originRect={{ left: 640, top: 40, width: 196, height: 48, borderRadius: 24 }}
          anchorToOrigin
          anchoredOffset={8}
          morphOnClose={false}
        >
          <p>Browse categories</p>
        </Modal>
      );
    };

    try {
      render(<Example />);

      const dialogs = screen.getAllByRole('dialog', { name: 'Categories' });
      const dialog = dialogs[dialogs.length - 1];
      const panel = dialog.firstElementChild?.firstElementChild as HTMLElement | null;

      expect(panel).not.toBeNull();

      const closeButtons = screen.getAllByRole('button', { name: 'Close modal' });

      await user.click(closeButtons[closeButtons.length - 1]);

      await waitFor(() => {
        expect(panel?.style.pointerEvents).toBe('none');
      });

      expect(panel?.style.transform).not.toBe('none');
      expect(panel?.style.filter).not.toBe('blur(0.5px)');
    } finally {
      getBoundingClientRectSpy.mockRestore();
    }
  });
});
