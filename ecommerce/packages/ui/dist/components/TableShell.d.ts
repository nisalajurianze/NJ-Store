import type { PropsWithChildren, ReactNode } from 'react';
export interface TableShellProps {
    caption?: string;
    header: ReactNode;
    body: ReactNode;
    className?: string;
    scrollContainerClassName?: string;
    tableClassName?: string;
    stickyHeader?: boolean;
}
export declare const TableShell: ({ caption, header, body, className, scrollContainerClassName, tableClassName, stickyHeader }: PropsWithChildren<TableShellProps>) => JSX.Element;
