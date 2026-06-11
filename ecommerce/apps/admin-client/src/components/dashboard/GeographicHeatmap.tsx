import type { AnalyticsGeographicPointDto } from '@njstore/types';
import { formatCurrency } from '@njstore/utils';

interface GeographicHeatmapProps {
  data: AnalyticsGeographicPointDto[];
  onOpenOrders?: () => void;
}

const compactNumberFormatter = new Intl.NumberFormat('en-LK', {
  notation: 'compact',
  maximumFractionDigits: 1
});

export const GeographicHeatmap = ({ data, onOpenOrders }: GeographicHeatmapProps): JSX.Element => {
  if (!data || data.length === 0) {
    return (
      <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
        <p className="max-w-sm text-sm leading-6 text-gray-400">No district sales yet.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orderCount, 0);
  const topDistrict = data[0];

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Districts</p>
          <p className="mt-1 font-display text-xl text-white">{data.length}</p>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Paid orders</p>
          <p className="mt-1 font-display text-xl text-white">{totalOrders}</p>
        </div>
        <div className="rounded-[16px] border border-gold/20 bg-gold/[0.08] px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Revenue</p>
          <p className="mt-1 font-mono text-sm text-white">LKR {compactNumberFormatter.format(totalRevenue)}</p>
        </div>
      </div>

      {topDistrict ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-3.5 py-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Top district</p>
            <p className="mt-1 text-sm font-medium text-white">{topDistrict.district}</p>
          </div>
          {onOpenOrders ? (
            <button
              type="button"
              onClick={onOpenOrders}
              className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-medium text-white transition hover:border-gold/25 hover:bg-gold/10"
            >
              View paid orders
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((item) => {
          const intensity = Math.max(0.15, item.revenue / (maxRevenue || 1));

          return (
            <div
              key={item.district}
              className="group relative min-w-0 overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.025] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.16)] transition duration-200 hover:border-gold/25 hover:bg-white/[0.045]"
            >
              <div
                className="absolute inset-x-0 bottom-0 top-0 bg-[linear-gradient(135deg,rgba(242,206,58,1),rgba(212,175,55,0.7))] transition-opacity duration-300 group-hover:opacity-60"
                style={{ opacity: intensity * 0.22 }}
              />

              <div className="relative z-10 flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{item.district}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-gray-300">
                    {item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white">
                  {Math.round((item.revenue / (totalRevenue || 1)) * 100)}%
                </span>
              </div>
              <p className="relative z-10 mt-3 font-mono text-xs font-semibold text-gold">{formatCurrency(item.revenue)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
