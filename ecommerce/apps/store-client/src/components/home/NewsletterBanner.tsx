import type { FormEvent } from 'react';
import { Button, Card, Input } from '@njstore/ui';
import { useTranslation } from 'react-i18next';
import { RevealSection } from './RevealSection';

interface NewsletterBannerProps {
  email: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export const NewsletterBanner = ({
  email,
  isSubmitting,
  onEmailChange,
  onSubmit
}: NewsletterBannerProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <RevealSection className="page-shell pt-2.5 pb-0 lg:pt-3 lg:pb-0">
      <Card className="theme-promo-surface relative overflow-hidden rounded-[1.55rem] border border-white/10 p-3 !shadow-none sm:p-3.5 sm:!shadow-none lg:px-4 lg:py-3.5">
        <div className="pointer-events-none absolute right-[-8%] top-[-22%] h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-20%] left-[42%] h-36 w-36 rounded-full bg-white/10 blur-3xl" />

        <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)] lg:items-center lg:gap-4">
          <div className="max-w-[38rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-gold">{t('newsletter.eyebrow')}</p>
            <h2 className="mt-1.5 max-w-[33rem] font-display text-[1.22rem] leading-[1.04] text-white [text-wrap:balance] sm:text-[1.42rem] lg:text-[1.72rem]">
              {t('newsletter.title')}
            </h2>
            <p className="mt-2 max-w-[29rem] text-[13px] leading-[1.45rem] text-gray-300">
              {t('newsletter.description')}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[t('newsletter.tagOne'), t('newsletter.tagTwo'), t('newsletter.tagThree')].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-gray-300 backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <form
            className="rounded-[1.1rem] border border-white/10 bg-white/[0.06] p-2.5 shadow-none backdrop-blur-md sm:p-3"
            onSubmit={onSubmit}
          >
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">{t('newsletter.formEyebrow')}</p>
              <p className="text-[13px] leading-[1.35rem] text-gray-300">{t('newsletter.formDescription')}</p>
            </div>
            <div className="mt-2.5 grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input
                id="newsletter-email"
                type="email"
                aria-label={t('newsletter.emailAria')}
                autoComplete="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@example.com"
                className="h-10 rounded-[1rem] border-white/12 bg-dark-light/70 shadow-none focus:border-gold/30 focus:ring-gold/15"
              />
              <div className="flex items-end">
                <Button
                  type="submit"
                  size="md"
                  className="h-10 w-full rounded-[1rem] px-5 sm:w-auto sm:min-w-[11rem]"
                  isLoading={isSubmitting}
                >
                  {t('newsletter.submit')}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-[1.1rem] text-gray-400">
              {t('newsletter.footer')}
            </p>
          </form>
        </div>
      </Card>
    </RevealSection>
  );
};
