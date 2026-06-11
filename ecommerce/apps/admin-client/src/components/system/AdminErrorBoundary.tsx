import type { ReactNode } from 'react';
import { Button, ErrorBoundary } from '@njstore/ui';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  level: 'app' | 'page' | 'widget';
  title?: string;
  description?: string;
  resetKeys?: unknown[];
}

const levelContainerClassName: Record<AdminErrorBoundaryProps['level'], string> = {
  app: 'min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.16),transparent_20%),linear-gradient(180deg,#07111f_0%,#0b1526_100%)]',
  page: '',
  widget: ''
};

const levelCardClassName: Record<AdminErrorBoundaryProps['level'], string> = {
  app: 'page-shell flex min-h-screen items-center justify-center py-16',
  page: 'pb-4',
  widget: 'rounded-[24px] border border-red-400/20 bg-red-500/10 p-4'
};

export const AdminErrorBoundary = ({
  children,
  level,
  title,
  description,
  resetKeys
}: AdminErrorBoundaryProps): JSX.Element => (
  <ErrorBoundary
    resetKeys={resetKeys}
    fallback={({ reset }) => (
      <div className={levelContainerClassName[level]}>
        <div className={levelCardClassName[level]}>
          <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.045] p-6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-md sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.26em] text-gold">
              {level === 'app' ? 'Workspace Error' : level === 'page' ? 'Page Error' : 'Widget Error'}
            </p>
            <h2 className="mt-4 font-display text-[1.85rem] leading-tight">
              {title ?? (level === 'widget' ? 'This admin panel section failed.' : 'Something broke in the workspace.')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
              {description ??
                (level === 'app'
                  ? 'The admin workspace hit an unexpected error. Retry here to recover the session.'
                  : level === 'page'
                    ? 'This admin page failed to render completely. Retry the page or move to another section.'
                    : 'This panel failed to render, but the rest of the workspace is still available.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={reset}>
                Try Again
              </Button>
              {level === 'app' ? (
                <Button type="button" variant="secondary" onClick={() => window.location.assign('/dashboard')}>
                  Dashboard
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
