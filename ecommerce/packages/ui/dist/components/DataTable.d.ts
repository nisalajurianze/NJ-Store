import type { ReactNode } from 'react';
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
export declare const DataTable: <T>({ caption, columns, items, getRowKey, emptyTitle, emptyDescription, className, rowClassName }: DataTableProps<T>) => JSX.Element;
