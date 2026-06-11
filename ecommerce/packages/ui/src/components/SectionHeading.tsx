import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'default' | 'compact';
}

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  action,
  size = 'default'
}: SectionHeadingProps): JSX.Element => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
    <div className="max-w-4xl">
      {eyebrow ? (
        <p className={size === 'compact' ? 'text-[10px] uppercase tracking-[0.28em] text-gold sm:text-xs' : 'text-[11px] uppercase tracking-[0.32em] text-gold sm:text-sm'}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={
          size === 'compact'
            ? 'mt-2 font-display text-[1.36rem] leading-[1.12] text-white sm:text-[1.95rem]'
            : 'mt-2.5 font-display text-[1.72rem] leading-[1.08] text-white sm:text-[2.35rem]'
        }
      >
        {title}
      </h2>
      {description ? (
        <p className={size === 'compact' ? 'mt-2.5 max-w-3xl text-[12px] leading-5 text-gray-400 sm:text-sm' : 'mt-3 max-w-3xl text-[13px] leading-6 text-gray-400 sm:text-[15px]'}>
          {description}
        </p>
      ) : null}
    </div>
    {action ? <div className="shrink-0 md:self-start">{action}</div> : null}
  </div>
);
