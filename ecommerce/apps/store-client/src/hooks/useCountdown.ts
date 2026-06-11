import { useEffect, useMemo, useState } from 'react';

export interface CountdownPart {
  label: string;
  value: string;
}

export const getCountdownParts = (target: string | undefined, now: number): CountdownPart[] | null => {
  if (!target) {
    return null;
  }

  const targetTime = new Date(target).getTime();
  if (Number.isNaN(targetTime) || targetTime <= now) {
    return null;
  }

  const remaining = targetTime - now;
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((remaining / (60 * 1000)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return [
    { label: 'Days', value: String(days).padStart(2, '0') },
    { label: 'Hours', value: String(hours).padStart(2, '0') },
    { label: 'Minutes', value: String(minutes).padStart(2, '0') },
    { label: 'Seconds', value: String(seconds).padStart(2, '0') }
  ];
};

interface UseCountdownOptions {
  target?: string;
  enabled?: boolean;
  intervalMs?: number;
}

export const useCountdown = ({
  target,
  enabled = Boolean(target),
  intervalMs = 1000
}: UseCountdownOptions): { countdown: CountdownPart[] | null; now: number } => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      setNow(Date.now());
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      setNow(Date.now());
    }, intervalMs);

    const syncVisibleNow = (): void => {
      if (typeof document === 'undefined' || !document.hidden) {
        setNow(Date.now());
      }
    };

    document.addEventListener('visibilitychange', syncVisibleNow);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', syncVisibleNow);
    };
  }, [enabled, intervalMs, target]);

  const countdown = useMemo(() => getCountdownParts(target, now), [now, target]);

  return { countdown, now };
};
