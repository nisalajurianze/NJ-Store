import { useEffect, type ReactNode } from 'react';
import { Button, ErrorBoundary } from '@njstore/ui';
import { isChunkLoadError, recoverFromChunkLoadError } from '../../utils/chunkRecovery';

interface StoreErrorBoundaryProps {
  children: ReactNode;
  level: 'app' | 'page' | 'widget';
  title?: string;
  description?: string;
  resetKeys?: unknown[];
}

const levelContainerClassName: Record<StoreErrorBoundaryProps['level'], string> = {
  app: 'min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.16),transparent_20%),linear-gradient(180deg,#07111f_0%,#0b1526_100%)]',
  page: '',
  widget: ''
};

const levelCardClassName: Record<StoreErrorBoundaryProps['level'], string> = {
  app: 'page-shell flex min-h-screen items-center justify-center py-16',
  page: 'page-shell py-10',
  widget: 'rounded-[28px] border border-red-400/20 bg-red-500/10 p-5'
};

const StoreErrorFallback = ({
  description,
  error,
  level,
  reset,
  title
}: {
  description?: string;
  error: Error;
  level: StoreErrorBoundaryProps['level'];
  reset: () => void;
  title?: string;
}): JSX.Element => {
  const isStaleChunk = isChunkLoadError(error);

  useEffect(() => {
    recoverFromChunkLoadError(error, `error-boundary-${level}`);
  }, [error, level]);

  return (
    <div className={levelContainerClassName[level]}>
      <div className={levelCardClassName[level]}>
        <div className="w-full rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-md sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.26em] text-gold">
            {level === 'app' ? 'Application Error' : level === 'page' ? 'Page Error' : 'Widget Error'}
          </p>
          <h2 className="mt-4 font-display text-[1.85rem] leading-tight">
            {title ?? (isStaleChunk ? 'Updating storefront.' : level === 'widget' ? 'This section hit a problem.' : 'Something went wrong.')}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
            {description ??
              (isStaleChunk
                ? 'A fresh store update is available. Refresh once to load the latest files.'
                : level === 'app'
                  ? 'The storefront hit an unexpected error. You can retry here without losing the rest of the session.'
                  : level === 'page'
                    ? 'This page could not finish rendering. Retry it here or move to another area of the store.'
                    : 'This part of the page failed to load, but the rest of the storefront is still available.')}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={isStaleChunk ? () => window.location.reload() : reset}>
              {isStaleChunk ? 'Refresh Page' : 'Try Again'}
            </Button>
            {level === 'app' ? (
              <Button type="button" variant="secondary" onClick={() => window.location.assign('/')}>
                Go Home
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StoreErrorBoundary = ({
  children,
  level,
  title,
  description,
  resetKeys
}: StoreErrorBoundaryProps): JSX.Element => (
  <ErrorBoundary
    resetKeys={resetKeys}
    fallback={({ error, reset }) => (
      <StoreErrorFallback description={description} error={error} level={level} reset={reset} title={title} />
    )}
  >
    {children}
  </ErrorBoundary>
);
