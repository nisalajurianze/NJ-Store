import { cn } from '@njstore/utils';
import { Shield } from 'lucide-react';

interface AdminAccessLimitedStateProps {
  className?: string;
  title?: string;
  description?: string;
}

export const AdminAccessLimitedState = ({
  className,
  title = 'Access limited',
  description = 'Your admin account is signed in, but it does not have permission to open this area yet.'
}: AdminAccessLimitedStateProps): JSX.Element => (
  <section
    className={cn(
      'admin-access-card relative overflow-hidden rounded-[34px] border border-white/10 px-6 py-12 shadow-[0_26px_54px_rgba(0,0,0,0.24)] sm:px-10 sm:py-16',
      'bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_18%),radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_22%),linear-gradient(180deg,rgba(29,42,69,0.9),rgba(21,30,51,0.96))]',
      className
    )}
  >
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%)]" />
    <div className="relative mx-auto flex min-h-[18rem] max-w-3xl flex-col items-center justify-center text-center">
      <div className="admin-access-icon flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-[4.5rem] sm:w-[4.5rem]">
        <Shield className="h-7 w-7 text-gold sm:h-8 sm:w-8" aria-hidden="true" />
      </div>

      <h2 className="mt-8 font-display text-[2rem] leading-none tracking-[-0.05em] text-white sm:text-[3rem]">
        {title}
      </h2>

      <p className="mx-auto mt-5 max-w-2xl text-[0.98rem] leading-7 text-gray-400 sm:text-[1.28rem] sm:leading-10">
        {description}
      </p>
    </div>
  </section>
);
