import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileDrawer } from './MobileDrawer.js';
describe('MobileDrawer', () => {
    it('closes when pressing outside the drawer panel', () => {
        const onClose = vi.fn();
        render(_jsx(MobileDrawer, { isOpen: true, title: "Filters", onClose: onClose, children: _jsx("p", { children: "Drawer body" }) }));
        const backdropHost = screen.getByText('Drawer body').parentElement?.parentElement?.parentElement;
        expect(backdropHost).not.toBeNull();
        fireEvent.pointerDown(backdropHost);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
