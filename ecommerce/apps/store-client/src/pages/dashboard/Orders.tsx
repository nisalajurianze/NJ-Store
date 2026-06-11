import { useQuery } from '@tanstack/react-query';
import type { OrderDto } from '@njstore/types';
import { Badge, Button, EmptyState, SectionHeading, Skeleton, TableShell } from '@njstore/ui';
import { ClipboardList, RefreshCcw, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { orderService } from '../../services/orderService';

const getOrderTypeLabel = (order: OrderDto): string => (order.isQuotation ? 'Quotation' : order.type);

export const DashboardOrders = (): JSX.Element => {
  const { formatCurrency } = useCurrencyFormatter();
  const orders = useQuery({
    queryKey: ['dashboard', 'orders'],
    queryFn: () => orderService.list(1, 20),
    refetchInterval: 15_000
  });
  const orderItems = orders.data?.data ?? [];

  return (
    <div className="space-y-6">
      <SectionHeading title="Order History" description="Track quotations, pending orders, and receipt verification." />
      {orders.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-[24px]" />
          ))}
        </div>
      ) : null}

      {orders.isError ? (
        <EmptyState
          icon={<RefreshCcw className="h-6 w-6 text-gold" />}
          title="We couldn’t load your orders"
          description="Your account is fine, but the latest quotation and order activity couldn’t be fetched right now."
          action={
            <Button variant="secondary" onClick={() => void orders.refetch()}>
              Try Again
            </Button>
          }
        />
      ) : null}

      {!orders.isLoading && !orders.isError && !orderItems.length ? (
        <>
          <EmptyState
            icon={<ClipboardList className="h-6 w-6 text-gold" />}
            title="No quotations or orders yet"
            description="When you create your first quotation, it will appear here with status updates, totals, and any receipt actions."
            action={
              <Link to="/shop">
                <Button>
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  Browse Products
                </Button>
              </Link>
            }
          />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: 'Add items to cart',
                description: 'Build a shortlist of products first so checkout can turn it into a quotation.'
              },
              {
                title: 'Create the quotation',
                description: 'Checkout saves a PDF quote to your account before any payment is confirmed.'
              },
              {
                title: 'Track every update',
                description: 'This page becomes your timeline for order progress, receipts, and fulfilment changes.'
              }
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!orders.isLoading && !orders.isError && orderItems.length ? (
        <>
          <div className="grid gap-3 sm:hidden">
            {orderItems.map((order) => (
              <article key={order.id} className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Number</p>
                    <p className="mt-1 break-words font-medium leading-snug text-white">{order.orderNumber}</p>
                  </div>
                  <Badge className="shrink-0">{order.status}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Type</dt>
                    <dd className="mt-1 capitalize text-gray-300">{getOrderTypeLabel(order)}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Total</dt>
                    <dd className="mt-1 font-mono text-gold">{formatCurrency(order.total)}</dd>
                  </div>
                </dl>
                <Link
                  to={`/dashboard/orders/${order.id}`}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-sm font-semibold text-gold transition-colors duration-200 hover:border-gold/40 hover:text-gold-light"
                >
                  View
                </Link>
              </article>
            ))}
          </div>
          <TableShell
            caption="Customer orders"
            className="hidden !shadow-none sm:block"
            header={
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                <th className="px-5 py-4">Number</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            }
            body={
              <>
                {orderItems.map((order) => (
                  <tr key={order.id} className="text-sm text-gray-300">
                    <td className="px-5 py-4 font-medium text-white">{order.orderNumber}</td>
                    <td className="px-5 py-4 capitalize">{getOrderTypeLabel(order)}</td>
                    <td className="px-5 py-4">
                      <Badge>{order.status}</Badge>
                    </td>
                    <td className="px-5 py-4">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-4">
                      <Link to={`/dashboard/orders/${order.id}`} className="text-gold transition-colors duration-200 hover:text-gold-light">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </>
            }
          />
        </>
      ) : null}
    </div>
  );
};
