import { useEffect, useState } from 'react';
import { subscribeToMediaQueryChange } from '../utils/mediaQuery';

export const shouldUseFastMotionPreference = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  const navigatorHints = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  const hardwareConcurrency =
    typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : undefined;

  return (
    window.matchMedia('(max-width: 767px)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    Boolean(navigatorHints.connection?.saveData) ||
    (typeof navigatorHints.deviceMemory === 'number' && navigatorHints.deviceMemory <= 4) ||
    (typeof hardwareConcurrency === 'number' && hardwareConcurrency <= 2)
  );
};

export const useFastMotionPreference = (): boolean => {
  const [isFastMotion, setIsFastMotion] = useState(() => shouldUseFastMotionPreference());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const queries = [
      window.matchMedia('(max-width: 767px)'),
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(hover: none)'),
      window.matchMedia('(prefers-reduced-motion: reduce)')
    ];
    const syncFastMotion = (): void => {
      setIsFastMotion(shouldUseFastMotionPreference());
    };
    const unsubscribers = queries.map((query) => subscribeToMediaQueryChange(query, syncFastMotion));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return isFastMotion;
};
