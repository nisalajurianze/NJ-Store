import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminDataGrid } from './AdminDataGrid';

describe('AdminDataGrid', () => {
  it('scrolls the list when the mouse wheel is used over the sticky header', () => {
    render(
      <div className="h-[320px]">
        <AdminDataGrid
          headers={['Name', 'Status']}
          gridClassName="grid grid-cols-2"
          hasRows={true}
          emptyMessage="No rows"
        >
          {Array.from({ length: 20 }, (_, index) => (
            <div key={index} className="grid grid-cols-2 px-4 py-3">
              <div>Row {index + 1}</div>
              <div>Active</div>
            </div>
          ))}
        </AdminDataGrid>
      </div>
    );

    const scrollArea = document.querySelector('[data-admin-grid-scroll="true"]') as HTMLDivElement | null;
    expect(scrollArea).not.toBeNull();

    if (!scrollArea) {
      return;
    }

    Object.defineProperty(scrollArea, 'clientHeight', {
      configurable: true,
      value: 220
    });
    Object.defineProperty(scrollArea, 'scrollHeight', {
      configurable: true,
      value: 840
    });
    Object.defineProperty(scrollArea, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0
    });

    fireEvent.wheel(screen.getByText('Name'), { deltaY: 120 });

    expect(scrollArea.scrollTop).toBe(120);
  });
});
