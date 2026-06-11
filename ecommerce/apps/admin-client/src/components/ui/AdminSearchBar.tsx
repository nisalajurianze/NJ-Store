import { Search } from 'lucide-react';

export interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  resultCount?: number;
  totalCount?: number;
}

export const AdminSearchBar = ({
  value,
  onChange,
  placeholder,
  label = 'Search',
  resultCount,
  totalCount
}: AdminSearchBarProps): JSX.Element => (
  <div className="admin-search-shell rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(16,28,49,0.92),rgba(12,21,38,0.9))] p-3 shadow-[0_10px_22px_rgba(0,0,0,0.14)] transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:border-gold/20 focus-within:bg-[#152442]">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-[9px] uppercase tracking-[0.22em] text-gold">{label}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {typeof resultCount === 'number' && typeof totalCount === 'number' ? (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-black/10 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-gray-300">
            Showing {resultCount} of {totalCount}
          </span>
        ) : null}
        <span className="inline-flex items-center rounded-full border border-white/10 bg-black/10 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-gray-400">
          `/` Focus search
        </span>
      </div>
    </div>
    <div className="admin-search-input-shell relative overflow-hidden rounded-xl border border-white/10 bg-[#111d33]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="pointer-events-none absolute inset-y-1.5 left-1.5 flex w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
        <Search className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <input
        data-admin-search-input="true"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="admin-search-field h-11 w-full bg-transparent pl-11 pr-4 text-[13px] text-white placeholder:text-gray-500 transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus:ring-2 focus:ring-gold/5"
      />
    </div>
  </div>
);
