import { useMemo } from 'react';

export type BrowseMode = 'pagination' | 'infinite';

export const useBrowseMode = (searchParams: URLSearchParams): BrowseMode =>
  useMemo(() => (searchParams.get('browse') === 'infinite' ? 'infinite' : 'pagination'), [searchParams]);
