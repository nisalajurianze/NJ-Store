import { jsx as _jsx } from "react/jsx-runtime";
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
        render(_jsx(Modal, { isOpen: true, title: "Categories", onClose: onClose, children: _jsx("p", { children: "Browse categories" }) }));
        const dialog = screen.getByRole('dialog', { name: 'Categories' });
        const backdropWrapper = dialog.firstElementChild;
        expect(backdropWrapper).not.toBeNull();
        fireEvent.pointerDown(backdropWrapper);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('can open from an origin trigger without collapsing back into it on close', async () => {
        const user = userEvent.setup();
        const getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
            x: 120,
            y: 96,
            left: 120,
            top: 96,
            right: 880,
            bottom: 516,
            width: 760,
            height: 420,
            toJSON: () => ({})
        }));
        const Example = () => {
            const [isOpen, setIsOpen] = useState(true);
            return (_jsx(Modal, { isOpen: isOpen, title: "Categories", onClose: () => setIsOpen(false), originRect: { left: 640, top: 40, width: 196, height: 48, borderRadius: 24 }, anchorToOrigin: true, anchoredOffset: 8, morphOnClose: false, children: _jsx("p", { children: "Browse categories" }) }));
        };
        try {
            render(_jsx(Example, {}));
            const dialogs = screen.getAllByRole('dialog', { name: 'Categories' });
            const dialog = dialogs[dialogs.length - 1];
            const panel = dialog.firstElementChild?.firstElementChild;
            expect(panel).not.toBeNull();
            const closeButtons = screen.getAllByRole('button', { name: 'Close modal' });
            await user.click(closeButtons[closeButtons.length - 1]);
            await waitFor(() => {
                expect(panel?.style.pointerEvents).toBe('none');
            });
            expect(panel?.style.transform).not.toBe('none');
            expect(panel?.style.filter).not.toBe('blur(0.5px)');
        }
        finally {
            getBoundingClientRectSpy.mockRestore();
        }
    });
});
