import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, Checkbox, DatePicker, RadioGroup, Select, Switch, Tabs, Tooltip } from './index.js';
describe('Button', () => {
    it('renders button content', () => {
        render(_jsx(Button, { children: "Checkout" }));
        expect(screen.getByRole('button', { name: 'Checkout' })).toBeTruthy();
    });
});
describe('form controls', () => {
    it('renders and changes a select value', () => {
        render(_jsx(Select, { label: "Status", defaultValue: "pending", options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Paid', value: 'paid' }
            ] }));
        const select = screen.getByLabelText('Status');
        fireEvent.change(select, { target: { value: 'paid' } });
        expect(select.value).toBe('paid');
    });
    it('renders checkbox checked and disabled states', () => {
        render(_jsx(Checkbox, { label: "Featured", defaultChecked: true, disabled: true }));
        const checkbox = screen.getByLabelText('Featured');
        expect(checkbox.checked).toBe(true);
        expect(checkbox.disabled).toBe(true);
    });
    it('renders radio options with a selected value', () => {
        render(_jsx(RadioGroup, { label: "Payment", name: "payment", value: "cod", options: [
                { label: 'Bank transfer', value: 'bank' },
                { label: 'Cash on delivery', value: 'cod' }
            ] }));
        expect(screen.getByLabelText('Cash on delivery').checked).toBe(true);
    });
    it('renders switch semantics', () => {
        render(_jsx(Switch, { label: "Maintenance mode", defaultChecked: true }));
        const toggle = screen.getByRole('switch', { name: 'Maintenance mode' });
        expect(toggle.checked).toBe(true);
    });
    it('renders shared tabs, tooltip, and date picker controls', () => {
        render(_jsxs(_Fragment, { children: [_jsx(Tabs, { label: "Workspace", value: "orders", onValueChange: () => undefined, items: [
                        { label: 'Orders', value: 'orders' },
                        { label: 'Products', value: 'products' }
                    ] }), _jsx(Tooltip, { content: "More detail", children: _jsx("button", { type: "button", children: "Info" }) }), _jsx(DatePicker, { label: "Publish at", mode: "datetime-local", defaultValue: "2026-04-08T10:00" })] }));
        expect(screen.getByRole('tab', { name: 'Orders' }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByRole('tooltip').textContent).toBe('More detail');
        expect(screen.getByLabelText('Publish at').getAttribute('type')).toBe('datetime-local');
    });
});
