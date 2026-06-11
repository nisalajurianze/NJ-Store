import { useQuery } from '@tanstack/react-query';
import { Card, SectionHeading, TableShell } from '@njstore/ui';
import { useAuth } from '../../context/AuthContext';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { authService } from '../../services/authService';

export const DashboardLoyalty = (): JSX.Element => {
  const { user } = useAuth();
  const { activeCurrency, formatCurrency } = useCurrencyFormatter();
  const history = useQuery({
    queryKey: ['dashboard', 'loyalty-history'],
    queryFn: () => authService.loyaltyHistory()
  });
  const historyEntries = history.data ?? [];

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
        <SectionHeading title="Loyalty Points" description={`Earn 1 point for every ${formatCurrency(100)} once an order is delivered.`} />
        <p className="mt-6 break-words font-mono text-[2.3rem] text-gold">{user?.loyaltyPoints ?? 0} pts</p>
        <p className="mt-3 text-sm leading-6 text-gray-400">Estimated value: {formatCurrency(user?.loyaltyPoints ?? 0)} in {activeCurrency.code}</p>
      </Card>
      {historyEntries.length ? (
        <div className="grid gap-3 sm:hidden">
          {historyEntries.map((entry) => (
            <article key={entry.id} className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Date</p>
                  <p className="mt-1 text-sm text-white">{new Date(entry.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="font-mono text-sm text-gold">{entry.points}</p>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Type</p>
                <p className="mt-1 text-sm capitalize text-gray-300">{entry.type}</p>
              </div>
              <p className="mt-3 break-words text-sm leading-6 text-gray-300">{entry.description}</p>
            </article>
          ))}
        </div>
      ) : null}
      <TableShell
        caption="Loyalty history"
        className="hidden !shadow-none sm:block"
        header={
          <tr className="text-left text-xs uppercase tracking-[0.2em] text-gray-400">
            <th className="px-5 py-4">Date</th>
            <th className="px-5 py-4">Type</th>
            <th className="px-5 py-4">Points</th>
            <th className="px-5 py-4">Description</th>
          </tr>
        }
        body={
          <>
            {historyEntries.map((entry) => (
              <tr key={entry.id} className="text-sm text-gray-300">
                <td className="px-5 py-4">{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4 capitalize">{entry.type}</td>
                <td className="px-5 py-4 text-gold">{entry.points}</td>
                <td className="px-5 py-4">{entry.description}</td>
              </tr>
            ))}
          </>
        }
      />
    </div>
  );
};
