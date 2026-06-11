import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@njstore/utils/cn';
import { premiumEase } from '@njstore/utils/motion';
import { motion, useReducedMotion } from 'framer-motion';
import { MouseReactiveParticles } from '../effects/MouseReactiveParticles';
import { useFastMotionPreference } from '../../hooks/useFastMotionPreference';

export interface AuthShellFeature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface AuthShellStat {
  value: string;
  label: string;
}

interface AuthShellProps {
  badge?: string;
  heroTitle: string;
  heroDescription: string;
  heroStats?: AuthShellStat[];
  heroHighlights?: AuthShellFeature[];
  quote?: string;
  quoteAttribution?: string;
  children: ReactNode;
  contentClassName?: string;
  layout?: 'split' | 'centered';
}

export const AuthShell = ({
  badge,
  heroTitle,
  heroDescription,
  heroStats = [],
  heroHighlights = [],
  quote = '',
  quoteAttribution = '',
  children,
  contentClassName,
  layout = 'split'
}: AuthShellProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const fastAuthMotion = useFastMotionPreference();
  const transition = reduceMotion ? undefined : { duration: fastAuthMotion ? 0.42 : 0.72, ease: premiumEase };
  const shouldRenderParticles = !reduceMotion && !fastAuthMotion;

  return (
    <section className="page-shell page-nav-gap pb-0">
      <div className="auth-shell-surface relative isolate overflow-hidden rounded-[30px] border">
        <div className="auth-shell-grid absolute inset-0" aria-hidden="true" />
        <div className="auth-shell-ambient auth-shell-ambient-gold absolute -left-16 top-6 h-44 w-44 rounded-full blur-3xl" aria-hidden="true" />
        <div className="auth-shell-ambient auth-shell-ambient-blue absolute bottom-0 right-0 h-56 w-56 rounded-full blur-3xl" aria-hidden="true" />
        {shouldRenderParticles ? <MouseReactiveParticles particleCount={72} interactionStrength={0.82} className="auth-shell-particles z-[1]" /> : null}

        {layout === 'centered' ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: fastAuthMotion ? 10 : 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={transition}
            className={cn('relative z-10 flex min-h-[520px] items-center justify-center px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8', contentClassName)}
          >
            <div className="w-full max-w-[36rem]">{children}</div>
          </motion.div>
        ) : (
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
            <motion.aside
              initial={reduceMotion ? false : { opacity: 0, x: fastAuthMotion ? -12 : -28 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              transition={transition}
              className="relative z-10 flex min-h-[280px] flex-col justify-between px-5 py-5 sm:px-7 sm:py-6 lg:min-h-[580px] lg:px-8 lg:py-8"
            >
              <div>
                {badge ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {badge}
                  </div>
                ) : null}

                <div className={cn('max-w-lg', badge ? 'mt-5' : 'mt-0')}>
                  <h1 className="font-display text-[1.82rem] leading-[1] text-white sm:text-[2.25rem] lg:text-[2.6rem]">
                    {heroTitle}
                  </h1>
                  <p className="mt-2.5 max-w-md text-sm leading-6 text-gray-300 sm:text-[14px]">{heroDescription}</p>
                </div>

                {heroStats.length > 0 ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {heroStats.map((stat) => (
                      <div key={stat.label} className="rounded-[20px] border border-white/10 bg-white/[0.045] p-3.5 backdrop-blur-sm">
                        <p className="text-[1.25rem] font-semibold text-white sm:text-[1.45rem]">{stat.value}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-gray-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {heroHighlights.length > 0 ? (
                  <div className="mt-6 grid gap-3">
                    {heroHighlights.map(({ title, description, icon: Icon }) => (
                      <div key={title} className="rounded-[22px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-gold">
                            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{title}</p>
                            <p className="mt-1 text-sm leading-6 text-gray-400">{description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {quote ? (
                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm sm:p-5">
                  <p className="text-[15px] leading-6 text-gray-100">{quote}</p>
                  {quoteAttribution ? <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-gold/80">{quoteAttribution}</p> : null}
                </div>
              ) : null}
            </motion.aside>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: fastAuthMotion ? 12 : 28 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              transition={transition}
              className={cn('relative z-10 flex items-center px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:py-6', contentClassName)}
            >
              <div className="w-full">{children}</div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
};
