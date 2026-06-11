import { useEffect, useRef, useState } from 'react';
import { subscribeToMediaQueryChange } from '../../utils/mediaQuery';

interface PreviewBudgetOptions {
  eligible: boolean;
  inView: boolean;
  priority: boolean;
}

interface PreviewBudgetEntry {
  id: number;
  order: number;
  eligible: boolean;
  inView: boolean;
  priority: boolean;
  granted: boolean;
  notify: (granted: boolean) => void;
}

const MOBILE_PREVIEW_BUDGET = 1;
const DESKTOP_PREVIEW_BUDGET = 4;
const SCROLL_IDLE_DELAY_MS = 260;

const previewEntries = new Map<number, PreviewBudgetEntry>();
let nextPreviewEntryId = 1;
let nextPreviewEntryOrder = 1;
let isUserScrolling = false;
let scrollIdleTimeoutId: number | null = null;
let isListeningForScroll = false;
let unsubscribeDesktopQuery: (() => void) | null = null;

const getPreviewBudget = (): number => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DESKTOP_PREVIEW_BUDGET;
  }

  return window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)').matches
    ? DESKTOP_PREVIEW_BUDGET
    : MOBILE_PREVIEW_BUDGET;
};

const recomputePreviewBudget = (): void => {
  if (isUserScrolling) {
    return;
  }

  const budget = getPreviewBudget();
  const orderedEntries = Array.from(previewEntries.values())
    .filter((entry) => entry.eligible && (entry.inView || entry.priority))
    .sort((left, right) => left.order - right.order);
  const priorityEntries = orderedEntries.filter((entry) => entry.priority);
  const budgetedEntries = orderedEntries.filter((entry) => !entry.priority).slice(0, budget);
  const grantedIds = new Set([...priorityEntries, ...budgetedEntries].map((entry) => entry.id));

  previewEntries.forEach((entry) => {
    const nextGranted = grantedIds.has(entry.id);
    if (entry.granted === nextGranted) {
      return;
    }

    entry.granted = nextGranted;
    entry.notify(nextGranted);
  });
};

const handlePreviewScroll = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!isUserScrolling) {
    isUserScrolling = true;
  }

  if (scrollIdleTimeoutId !== null) {
    window.clearTimeout(scrollIdleTimeoutId);
  }

  scrollIdleTimeoutId = window.setTimeout(() => {
    isUserScrolling = false;
    scrollIdleTimeoutId = null;
    recomputePreviewBudget();
  }, SCROLL_IDLE_DELAY_MS);
};

export const isProductPreviewBudgetScrollActive = (): boolean => isUserScrolling;

const ensurePreviewBudgetListeners = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!isListeningForScroll) {
    window.addEventListener('scroll', handlePreviewScroll, { passive: true });
    isListeningForScroll = true;
  }

  if (!unsubscribeDesktopQuery && typeof window.matchMedia === 'function') {
    unsubscribeDesktopQuery = subscribeToMediaQueryChange(
      window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)'),
      recomputePreviewBudget
    );
  }
};

const releasePreviewBudgetListeners = (): void => {
  if (previewEntries.size > 0 || typeof window === 'undefined') {
    return;
  }

  if (isListeningForScroll) {
    window.removeEventListener('scroll', handlePreviewScroll);
    isListeningForScroll = false;
  }

  if (scrollIdleTimeoutId !== null) {
    window.clearTimeout(scrollIdleTimeoutId);
    scrollIdleTimeoutId = null;
  }

  unsubscribeDesktopQuery?.();
  unsubscribeDesktopQuery = null;
  isUserScrolling = false;
};

export const useProductPreviewBudget = ({ eligible, inView, priority }: PreviewBudgetOptions): boolean => {
  const idRef = useRef<number | null>(null);
  const orderRef = useRef<number | null>(null);
  const [isGranted, setIsGranted] = useState(false);

  useEffect(() => {
    const id = nextPreviewEntryId;
    const order = nextPreviewEntryOrder;
    nextPreviewEntryId += 1;
    nextPreviewEntryOrder += 1;
    idRef.current = id;
    orderRef.current = order;

    previewEntries.set(id, {
      id,
      order,
      eligible,
      inView,
      priority,
      granted: false,
      notify: setIsGranted
    });
    ensurePreviewBudgetListeners();
    recomputePreviewBudget();

    return () => {
      previewEntries.delete(id);
      recomputePreviewBudget();
      releasePreviewBudgetListeners();
    };
  }, []);

  useEffect(() => {
    const id = idRef.current;
    if (id === null) {
      return;
    }

    const entry = previewEntries.get(id);
    if (!entry) {
      return;
    }

    entry.eligible = eligible;
    entry.inView = inView;
    entry.priority = priority;
    recomputePreviewBudget();
  }, [eligible, inView, priority]);

  return isGranted;
};
