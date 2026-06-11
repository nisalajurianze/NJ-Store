import { CheckCircle2 } from 'lucide-react';
import { cn } from '@njstore/utils/cn';
import { getPasswordStrengthSummary } from '../../utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
  compact?: boolean;
}

const compactRequirementLabels = {
  length: '8+',
  lowercase: 'a-z',
  uppercase: 'A-Z',
  number: '0-9',
  symbol: '#$'
} as const;

const toneClasses: Record<ReturnType<typeof getPasswordStrengthSummary>['tone'], string> = {
  neutral: 'text-gray-300 border-white/10 bg-white/[0.04]',
  weak: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  fair: 'text-amber-200 border-amber-400/30 bg-amber-500/10',
  strong: 'text-emerald-200 border-emerald-400/30 bg-emerald-500/10'
};

const barClasses: Record<ReturnType<typeof getPasswordStrengthSummary>['tone'], string> = {
  neutral: 'bg-white/8',
  weak: 'bg-rose-400',
  fair: 'bg-amber-400',
  strong: 'bg-emerald-400'
};

export const PasswordStrengthMeter = ({ password, className, compact = false }: PasswordStrengthMeterProps): JSX.Element => {
  const summary = getPasswordStrengthSummary(password);
  const compactHelperText =
    summary.tone === 'neutral'
      ? 'Need 8+ chars with A-Z, a-z, 0-9, and a symbol.'
      : summary.tone === 'strong'
        ? 'Ready to use.'
        : summary.tone === 'fair'
          ? 'Almost there. Finish the missing checks.'
          : 'Add the missing checks.';

  return (
    <div
      className={cn(
        compact ? 'rounded-[15px] border border-white/10 bg-white/[0.03] p-2.5' : 'rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className={cn(compact ? 'text-[10px] uppercase tracking-[0.24em] text-gold/80' : 'text-[11px] uppercase tracking-[0.28em] text-gold/80')}>
            Password strength
          </p>
          <p
            aria-live="polite"
            className={cn(compact ? 'mt-1 max-w-[15rem] text-[10px] leading-4 text-gray-400 sm:max-w-[17rem]' : 'mt-2 text-sm font-semibold text-white')}
          >
            {compact ? compactHelperText : summary.label}
          </p>
        </div>
        <span
          className={cn(
            compact
              ? 'rounded-full border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em]'
              : 'rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em]',
            toneClasses[summary.tone]
          )}
        >
          {compact ? summary.label : password ? `~${Math.round(summary.entropyBits)} bits` : 'Live meter'}
        </span>
      </div>

      <div className={cn(compact ? 'mt-2 grid grid-cols-4 gap-1' : 'mt-4 grid grid-cols-4 gap-2')} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className={cn(
              compact ? 'h-1 rounded-full transition-[background-color,opacity,transform] duration-200' : 'h-2 rounded-full transition-[background-color,opacity] duration-200',
              index < summary.filledBars ? barClasses[summary.tone] : 'bg-white/8'
            )}
          />
        ))}
      </div>

      {!compact ? <p className="mt-3 text-xs leading-5 text-gray-400">{summary.feedback}</p> : null}

      {compact ? (
        <div className="mt-2 grid grid-cols-5 gap-1">
          {summary.requirements.map((requirement) => (
            <span
              key={requirement.key}
              className={cn(
                'inline-flex min-w-0 items-center justify-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] leading-4 transition-[background-color,border-color,color,transform] duration-200',
                requirement.met ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-gray-400'
              )}
            >
              {requirement.met ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" aria-hidden="true" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-white/20" aria-hidden="true" />}
              <span>{compactRequirementLabels[requirement.key]}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {summary.requirements.map((requirement) => (
            <div
              key={requirement.key}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition-colors duration-200',
                requirement.met ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-gray-400'
              )}
            >
              {requirement.met ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20" aria-hidden="true" />
              )}
              <span>{requirement.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
