import type { ReactNode } from 'react';
import { cn } from '@njstore/utils/cn';

interface AuthCardHeaderProps {
  title: string;
  description?: string;
  topSlot?: ReactNode;
  className?: string;
}

export const AuthCardHeader = ({ title, description, topSlot, className }: AuthCardHeaderProps): JSX.Element => (
  <div className={cn('space-y-4', className)}>
    {topSlot ? <div className="flex justify-end text-right">{topSlot}</div> : null}
    <div className="space-y-2">
      <h1 className="max-w-[18rem] font-display text-[1.95rem] leading-[0.94] text-white sm:max-w-none sm:text-[2.2rem]">{title}</h1>
      {description ? <p className="max-w-md text-sm leading-6 text-gray-400">{description}</p> : null}
    </div>
  </div>
);
