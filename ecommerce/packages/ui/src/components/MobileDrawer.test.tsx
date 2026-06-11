import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileDrawer } from './MobileDrawer.js';

describe('MobileDrawer', () => {
  it('closes when pressing outside the drawer panel', () => {
    const onClose = vi.fn();

    render(
      <MobileDrawer isOpen title="Filters" onClose={onClose}>
        <p>Drawer body</p>
      </MobileDrawer>
    );

    const backdropHost = screen.getByText('Drawer body').parentElement?.parentElement?.parentElement;

    expect(backdropHost).not.toBeNull();

    fireEvent.pointerDown(backdropHost as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
