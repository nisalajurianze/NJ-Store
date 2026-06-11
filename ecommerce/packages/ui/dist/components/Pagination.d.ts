export interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
    className?: string;
}
export declare const Pagination: ({ page, totalPages, onPageChange, disabled, className }: PaginationProps) => JSX.Element | null;
