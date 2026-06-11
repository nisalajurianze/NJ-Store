import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, Checkbox, DatePicker, RadioGroup, Select, Switch, Tabs, Tooltip } from './index.js';

describe('Button', () => {
  it('renders button content', () => {
    render(<Button>Checkout</Button>);
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeTruthy();
  });
});

describe('form controls', () => {
  it('renders and changes a select value', () => {
    render(
      <Select
        label="Status"
        defaultValue="pending"
        options={[
          { label: 'Pending', value: 'pending' },
          { label: 'Paid', value: 'paid' }
        ]}
      />
    );

    const select = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'paid' } });
    expect(select.value).toBe('paid');
  });

  it('renders checkbox checked and disabled states', () => {
    render(<Checkbox label="Featured" defaultChecked disabled />);
    const checkbox = screen.getByLabelText('Featured') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });

  it('renders radio options with a selected value', () => {
    render(
      <RadioGroup
        label="Payment"
        name="payment"
        value="cod"
        options={[
          { label: 'Bank transfer', value: 'bank' },
          { label: 'Cash on delivery', value: 'cod' }
        ]}
      />
    );

    expect((screen.getByLabelText('Cash on delivery') as HTMLInputElement).checked).toBe(true);
  });

  it('renders switch semantics', () => {
    render(<Switch label="Maintenance mode" defaultChecked />);
    const toggle = screen.getByRole('switch', { name: 'Maintenance mode' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('renders shared tabs, tooltip, and date picker controls', () => {
    render(
      <>
        <Tabs
          label="Workspace"
          value="orders"
          onValueChange={() => undefined}
          items={[
            { label: 'Orders', value: 'orders' },
            { label: 'Products', value: 'products' }
          ]}
        />
        <Tooltip content="More detail">
          <button type="button">Info</button>
        </Tooltip>
        <DatePicker label="Publish at" mode="datetime-local" defaultValue="2026-04-08T10:00" />
      </>
    );

    expect(screen.getByRole('tab', { name: 'Orders' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tooltip').textContent).toBe('More detail');
    expect(screen.getByLabelText('Publish at').getAttribute('type')).toBe('datetime-local');
  });
});
