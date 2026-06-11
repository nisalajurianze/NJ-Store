import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@njstore/utils/cn';

export interface StoreBreadcrumbItem {
  label: string;
  to?: string;
}

export interface StoreBreadcrumbsProps {
  items: StoreBreadcrumbItem[];
  className?: string;
}

export const StoreBreadcrumbs = ({ items, className }: StoreBreadcrumbsProps): JSX.Element | null => {
  if (!items.length) {
    return null;
  }

  const normalizedItems =
    items[0]?.to === '/' || items[0]?.label.toLowerCase() === 'home'
      ? items
      : [{ label: 'Store', to: '/' }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={cn('mb-5', className)}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
        {normalizedItems.map((item, index) => {
          const isLast = index === normalizedItems.length - 1;

          return (
            <li key={`${item.label}-${item.to ?? index}`} className="flex items-center gap-2">
              {index === 0 ? <Home className="h-3.5 w-3.5 text-gold/90" aria-hidden="true" /> : null}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="transition-colors duration-200 hover:text-white"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-white' : undefined}>{item.label}</span>
              )}
              {!isLast ? <ChevronRight className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
