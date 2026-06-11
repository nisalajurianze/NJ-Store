import type { ReactNode } from 'react';
import { cn } from '@njstore/utils/cn';
import { EmptyState } from './EmptyState.js';
import { TableShell } from './TableShell.js';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  caption?: string;
  columns: Array<DataTableColumn<T>>;
  items: T[];
  getRowKey: (item: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  rowClassName?: (item: T, index: number) => string | undefined;
}

export const DataTable = <T,>({
  caption,
  columns,
  items,
  getRowKey,
  emptyTitle = 'No rows found',
  emptyDescription = 'Records will appear here when they are available.',
  className,
  rowClassName
}: DataTableProps<T>): JSX.Element => {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <TableShell
      caption={caption}
      className={className}
      header={
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400', column.headerClassName)}
            >
              {column.header}
            </th>
          ))}
        </tr>
      }
      body={
        <>
          {items.map((item, index) => (
            <tr key={getRowKey(item, index)} className={cn('transition-colors hover:bg-white/[0.03]', rowClassName?.(item, index))}>
              {columns.map((column) => (
                <td key={column.key} className={cn('px-4 py-3 text-sm text-gray-300', column.className)}>
                  {column.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </>
      }
    />
  );
};
