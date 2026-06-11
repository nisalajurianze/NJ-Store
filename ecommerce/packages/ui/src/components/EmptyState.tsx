import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, icon, action }: EmptyStateProps): JSX.Element => (
  <div className="rounded-[22px] border border-dashed border-white/15 bg-white/5 p-5 text-center sm:rounded-[28px] sm:p-10">
    {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] sm:mb-5 sm:h-14 sm:w-14">{icon}</div> : null}
    <h3 className="font-display text-[1.45rem] leading-tight text-white sm:text-[2rem]">{title}</h3>
    <p className="mx-auto mt-2.5 max-w-md text-[13px] leading-5 text-gray-400 sm:mt-3 sm:text-sm sm:leading-6">{description}</p>
    {action ? <div className="mt-5 sm:mt-6">{action}</div> : null}
  </div>
);
