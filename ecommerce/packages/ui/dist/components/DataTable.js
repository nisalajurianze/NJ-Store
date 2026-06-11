import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { cn } from '@njstore/utils/cn';
import { EmptyState } from './EmptyState.js';
import { TableShell } from './TableShell.js';
export const DataTable = ({ caption, columns, items, getRowKey, emptyTitle = 'No rows found', emptyDescription = 'Records will appear here when they are available.', className, rowClassName }) => {
    if (!items.length) {
        return _jsx(EmptyState, { title: emptyTitle, description: emptyDescription });
    }
    return (_jsx(TableShell, { caption: caption, className: className, header: _jsx("tr", { children: columns.map((column) => (_jsx("th", { scope: "col", className: cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400', column.headerClassName), children: column.header }, column.key))) }), body: _jsx(_Fragment, { children: items.map((item, index) => (_jsx("tr", { className: cn('transition-colors hover:bg-white/[0.03]', rowClassName?.(item, index)), children: columns.map((column) => (_jsx("td", { className: cn('px-4 py-3 text-sm text-gray-300', column.className), children: column.cell(item) }, column.key))) }, getRowKey(item, index)))) }) }));
};
