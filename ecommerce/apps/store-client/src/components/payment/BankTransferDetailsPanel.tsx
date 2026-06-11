import type { BankTransferDetailsDto } from '@njstore/types';
import { Banknote, Building2, Hash, MapPinned, UserRound, type LucideIcon } from 'lucide-react';
import { cn } from '@njstore/utils/cn';

interface BankTransferDetailsPanelProps {
  details?: Partial<BankTransferDetailsDto> | null;
  className?: string;
  title?: string;
  description?: string;
  compact?: boolean;
}

export const hasBankTransferDetails = (details?: Partial<BankTransferDetailsDto> | null): boolean =>
  Boolean(
    details?.accountName?.trim() ||
      details?.bankName?.trim() ||
      details?.branch?.trim() ||
      details?.accountNumber?.trim()
  );

export const BankTransferDetailsPanel = ({
  details,
  className,
  title = 'Bank transfer details',
  description = 'Use these account details after your quotation is confirmed, then upload the transfer receipt from your order page.',
  compact = false
}: BankTransferDetailsPanelProps): JSX.Element => {
  const rows: Array<{ label: string; value?: string; icon: LucideIcon }> = [
    {
      label: 'Account name',
      value: details?.accountName,
      icon: UserRound
    },
    {
      label: 'Bank',
      value: details?.bankName,
      icon: Building2
    },
    {
      label: 'Branch',
      value: details?.branch,
      icon: MapPinned
    },
    {
      label: 'Account number',
      value: details?.accountNumber,
      icon: Hash
    }
  ].filter((row): row is { label: string; value: string; icon: LucideIcon } => Boolean(row.value?.trim()));

  return (
    <div
      className={cn(
        'rounded-[24px] border border-white/10 bg-white/[0.045] p-4 text-sm text-gray-300',
        'dark:border-white/10 dark:bg-white/[0.045]',
        'html-light-bank-panel',
        compact ? 'sm:p-5' : 'sm:p-6',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
          <Banknote className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">{description}</p>
        </div>
      </div>

      {rows.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const Icon = row.icon;

            return (
              <div key={row.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <dt className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {row.label}
                </dt>
                <dd className="mt-2 break-words text-sm font-medium text-white">{row.value}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm leading-6 text-gray-300">
          Bank transfer details are not available yet. The team will confirm payment instructions with your quotation.
        </div>
      )}
    </div>
  );
};
