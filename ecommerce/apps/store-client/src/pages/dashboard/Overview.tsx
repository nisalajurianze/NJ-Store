import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Heart, MapPin, Shield, ShoppingBag, Truck } from 'lucide-react';
import { Badge, Button, SectionHeading } from '@njstore/ui';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { orderService } from '../../services/orderService';

const ORDER_PROGRESS_STEPS = ['pending', 'processing', 'shipped', 'delivered'] as const;

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const toTitleCase = (value: string): string =>
  value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const formatDateTime = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
};

const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'delivered') {
    return 'success';
  }
  if (status === 'cancelled') {
    return 'danger';
  }
  if (status === 'shipped') {
    return 'info';
  }
  return 'warning';
};

export const DashboardOverview = (): JSX.Element => {
  const { user, addresses } = useAuth();
  const { formatCurrency } = useCurrencyFormatter();
  const greeting = getGreeting();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'Customer';
  const orders = useQuery({
    queryKey: ['dashboard', 'overview-orders'],
    queryFn: () => orderService.list(1, 5, { sortBy: 'activity' }),
    refetchInterval: 15_000
  });

  const recentOrders = orders.data?.data ?? [];
  const recentOrder = recentOrders[0];
  const latestTimelineEntry = recentOrder ? recentOrder.timeline[recentOrder.timeline.length - 1] : undefined;
  const totalOrders = orders.data?.pagination?.total ?? recentOrders.length;

  const completionItems = [
    {
      label: 'Add your full name',
      hint: 'Makes your quotations and receipts easier to recognize.',
      complete: Boolean(user?.name?.trim()),
      href: '/dashboard/profile'
    },
    {
      label: 'Add a phone number',
      hint: 'Helpful when we need to confirm delivery details.',
      complete: Boolean(user?.phone?.trim()),
      href: '/dashboard/profile'
    },
    {
      label: 'Save a delivery address',
      hint: 'Speeds up quotation confirmation and shipping setup.',
      complete: addresses.length > 0,
      href: '/dashboard/profile?section=addresses'
    },
    {
      label: 'Verify your email',
      hint: 'Required before a quotation can become an order.',
      complete: Boolean(user?.isEmailVerified),
      href: '/dashboard/security?section=verification'
    }
  ];

  const completedItems = completionItems.filter((item) => item.complete).length;
  const completionPercent = Math.round((completedItems / completionItems.length) * 100);
  const nextIncomplete = completionItems.find((item) => !item.complete);
  const progressIndex = recentOrder && ORDER_PROGRESS_STEPS.includes(recentOrder.status as (typeof ORDER_PROGRESS_STEPS)[number])
    ? ORDER_PROGRESS_STEPS.indexOf(recentOrder.status as (typeof ORDER_PROGRESS_STEPS)[number])
    : -1;

  const quickActions = [
    {
      title: 'Track Orders',
      description: recentOrder ? `Open ${recentOrder.orderNumber} and follow the latest delivery or quotation updates.` : 'Review every quotation, receipt upload, and fulfilment update.',
      to: recentOrder ? `/dashboard/orders/${recentOrder.id}` : '/dashboard/orders',
      icon: Truck
    },
    {
      title: 'Start New Quotation',
      description: 'Jump straight into checkout to create a fresh quotation request.',
      to: '/checkout',
      icon: ShoppingBag
    },
    {
      title: 'Browse Wishlist',
      description: 'Return to the products you saved while comparing options.',
      to: '/dashboard/wishlist',
      icon: Heart
    },
    {
      title: nextIncomplete ? 'Finish Account Setup' : 'Manage Addresses',
      description: nextIncomplete ? nextIncomplete.hint : 'Keep your delivery destinations and contact details up to date.',
      to: nextIncomplete?.href ?? '/dashboard/profile?section=addresses',
      icon: !nextIncomplete || nextIncomplete.href === '/dashboard/profile?section=addresses' ? MapPin : Shield
    }
  ];

  return (
    <div className="space-y-6">
      <SectionHeading
        title={`${greeting}, ${firstName} 👋`}
        size="compact"
        description="Keep an eye on your latest order activity, rewards balance, and the next steps that keep checkout friction-free."
        action={
          <div className="flex flex-wrap items-center gap-3" aria-label="Quick actions">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  to={action.to}
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.055] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-gold/30 hover:bg-gold/10 hover:text-gold-light hover:shadow-[0_14px_28px_rgba(212,175,55,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-dark motion-reduce:transform-none"
                  aria-label={action.title}
                  title={action.title}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Account Snapshot</p>
          <h2 className="mt-4 font-display text-[1.8rem] leading-tight text-white sm:text-[1.95rem]">Everything important is in one place.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
            Review your most recent order, see how many loyalty points are ready to use later, and finish any account steps that could slow down confirmation or delivery.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-none">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Orders placed</p>
              <p className="mt-2 font-mono text-[1.65rem] text-white">{totalOrders}</p>
              <p className="mt-2 text-sm text-gray-400">Across quotations, pending payments, and completed purchases.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-none">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Points available</p>
              <p className="mt-2 font-mono text-[1.65rem] text-gold">{user?.loyaltyPoints ?? 0}</p>
              <p className="mt-2 text-sm text-gray-400">Estimated value: {formatCurrency(user?.loyaltyPoints ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/[0.055] p-4 shadow-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Recent Order Timeline</p>
              <h3 className="mt-2 font-display text-[1.12rem] leading-tight text-white sm:text-[1.22rem]">
                {recentOrder ? recentOrder.orderNumber : 'No orders yet'}
              </h3>
            </div>
            {recentOrder ? (
              <Badge variant={getStatusVariant(recentOrder.status)} className="px-2 py-0.5 text-[10px]">
                {toTitleCase(recentOrder.status)}
              </Badge>
            ) : null}
          </div>

          {orders.isLoading ? (
            <p className="mt-4 text-[13px] leading-5 text-gray-300">Loading your latest order activity...</p>
          ) : null}

          {orders.isError ? (
            <div className="mt-4 space-y-3">
              <p className="text-[13px] leading-5 text-gray-300">We could not load your recent order activity right now.</p>
              <Link to="/dashboard/orders">
                <Button variant="secondary" size="sm" className="h-8 rounded-[12px] px-3 text-xs">
                  Open Orders
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : null}

          {!orders.isLoading && !orders.isError && recentOrder ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-gray-300 sm:text-[13px]">
                <span>{recentOrder.isQuotation ? 'Quotation' : toTitleCase(recentOrder.type)}</span>
                <span className="text-white/35">•</span>
                <span>{formatCurrency(recentOrder.total)}</span>
                {formatDateTime(recentOrder.updatedAt ?? recentOrder.createdAt) ? (
                  <>
                    <span className="text-white/35">•</span>
                    <span>{formatDateTime(recentOrder.updatedAt ?? recentOrder.createdAt)}</span>
                  </>
                ) : null}
              </div>

              {recentOrder.status !== 'cancelled' ? (
                <div className="mt-4 grid grid-cols-4 gap-2" aria-label="Recent order progress">
                  {ORDER_PROGRESS_STEPS.map((status, index) => {
                    const isReached = progressIndex >= index;
                    const isCurrent = progressIndex === index;

                    return (
                      <div key={status}>
                        <div className={`h-1 rounded-full transition-colors duration-300 ${isReached ? 'bg-gold' : 'bg-white/10'}`} />
                        <p className={`mt-1.5 text-[9px] uppercase tracking-[0.14em] sm:text-[10px] ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
                          {toTitleCase(status)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-[13px] leading-5 text-red-200">
                  This order was cancelled. Open the detail page if you need the full status history.
                </div>
              )}

              <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Latest update</p>
                <p className="mt-1.5 text-[13px] font-medium leading-5 text-white">
                  {latestTimelineEntry?.note ?? `${toTitleCase(recentOrder.status)} update recorded for this order.`}
                </p>
                {formatDateTime(latestTimelineEntry?.createdAt ?? recentOrder.updatedAt ?? recentOrder.createdAt) ? (
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {formatDateTime(latestTimelineEntry?.createdAt ?? recentOrder.updatedAt ?? recentOrder.createdAt)}
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <Link to={`/dashboard/orders/${recentOrder.id}`}>
                  <Button variant="secondary" size="sm" className="h-8 rounded-[12px] px-3 text-xs">
                    Track Order
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}

          {!orders.isLoading && !orders.isError && !recentOrder ? (
            <div className="mt-4 space-y-3">
              <p className="text-[13px] leading-5 text-gray-300">
                Once you request your first quotation, the latest status updates will appear here with a clear progress view.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/shop">
                  <Button variant="secondary" size="sm" className="h-8 rounded-[12px] px-3 text-xs">
                    Browse Shop
                  </Button>
                </Link>
                <Link to="/checkout">
                  <Button size="sm" className="h-8 rounded-[12px] px-3 text-xs">Start New Quotation</Button>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[20px] border border-white/10 bg-white/[0.045] p-4 shadow-none sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Account Completion</p>
            <h3 className="mt-1.5 font-display text-[1.2rem] leading-tight text-white sm:text-[1.35rem]">
              {completionPercent}% ready
            </h3>
          </div>
          <Badge
            variant={completionPercent === 100 ? 'success' : completionPercent >= 50 ? 'info' : 'warning'}
            className="px-2.5 py-1 text-[10px]"
          >
            {completedItems}/{completionItems.length} done
          </Badge>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium">
            <span className="text-gray-300">Profile readiness</span>
            <span className="text-gold">{completionPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>

        <div className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
          {completionItems.map((item) => {
            const content = (
              <>
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.complete ? 'bg-emerald-300' : 'bg-gold'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-white">{item.label}</span>
                  <span className="mt-0.5 block line-clamp-1 text-[11px] text-gray-400">{item.hint}</span>
                </span>
                <span className={`shrink-0 text-[11px] font-medium ${item.complete ? 'text-emerald-300' : 'text-gold'}`}>
                  {item.complete ? 'Done' : 'Fix'}
                </span>
              </>
            );

            return item.complete ? (
              <div key={item.label} className="flex min-w-0 items-start gap-2 border-t border-white/10 py-2.5">
                {content}
              </div>
            ) : (
              <Link
                key={item.label}
                to={item.href}
                className="group flex min-w-0 items-start gap-2 border-t border-white/10 py-2.5 transition-colors duration-200 hover:border-gold/30"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
};
