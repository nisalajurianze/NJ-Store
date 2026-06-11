import { forwardRef, useCallback, useEffect, useRef, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { cn } from '@njstore/utils/cn';
import { subscribeToMediaQueryChange } from '../../utils/mediaQuery';

export interface ProgressiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fetchPriority?: 'high' | 'low' | 'auto';
  loadedClassName?: string;
  loadingClassName?: string;
  transitionClassName?: string;
}

const DEFAULT_LOADED_CLASSNAME = 'blur-0 opacity-100';
const DEFAULT_LOADING_CLASSNAME = 'blur-xl opacity-60';
const DEFAULT_TRANSITION_CLASSNAME = 'transition-[filter,opacity] duration-500 ease-out';
const REDUCED_FILTER_LOADED_CLASSNAME = 'opacity-100';
const REDUCED_FILTER_LOADING_CLASSNAME = 'opacity-0';
const REDUCED_FILTER_TRANSITION_CLASSNAME = 'transition-opacity duration-300 ease-out';

const shouldReduceImageFilters = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  const navigatorHints = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };

  return (
    Boolean(navigatorHints.connection?.saveData) ||
    (typeof navigatorHints.deviceMemory === 'number' && navigatorHints.deviceMemory <= 4) ||
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
};

export const ProgressiveImage = forwardRef<HTMLImageElement, ProgressiveImageProps>(function ProgressiveImage(
  {
    className,
    decoding = 'async',
    loadedClassName = DEFAULT_LOADED_CLASSNAME,
    loadingClassName = DEFAULT_LOADING_CLASSNAME,
    onLoad,
    fetchPriority,
    src,
    transitionClassName = DEFAULT_TRANSITION_CLASSNAME,
    ...props
  },
  forwardedRef
): JSX.Element {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [reduceImageFilters, setReduceImageFilters] = useState(() => shouldReduceImageFilters());
  const setImageRef = useCallback(
    (node: HTMLImageElement | null): void => {
      imageRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
        return;
      }

      if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  useEffect(() => {
    setIsLoaded((current) => (current ? false : current));
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth > 0) {
      setIsLoaded((current) => (current ? current : true));
    }
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    if (fetchPriority) {
      image.setAttribute('fetchpriority', fetchPriority);
      return;
    }

    image.removeAttribute('fetchpriority');
  }, [fetchPriority, src]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const queries = [
      window.matchMedia('(hover: none)'),
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(prefers-reduced-motion: reduce)')
    ];
    const syncFilterPreference = (): void => {
      setReduceImageFilters(shouldReduceImageFilters());
    };
    const unsubscribers = queries.map((query) => subscribeToMediaQueryChange(query, syncFilterPreference));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
    setIsLoaded((current) => (current ? current : true));
    onLoad?.(event);
  };
  const effectiveLoadedClassName =
    reduceImageFilters && loadedClassName === DEFAULT_LOADED_CLASSNAME ? REDUCED_FILTER_LOADED_CLASSNAME : loadedClassName;
  const effectiveLoadingClassName =
    reduceImageFilters && loadingClassName === DEFAULT_LOADING_CLASSNAME ? REDUCED_FILTER_LOADING_CLASSNAME : loadingClassName;
  const effectiveTransitionClassName =
    reduceImageFilters && transitionClassName === DEFAULT_TRANSITION_CLASSNAME ? REDUCED_FILTER_TRANSITION_CLASSNAME : transitionClassName;

  return (
    <img
      {...props}
      ref={setImageRef}
      src={src}
      decoding={decoding}
      onLoad={handleLoad}
      className={cn(effectiveTransitionClassName, isLoaded ? effectiveLoadedClassName : effectiveLoadingClassName, className)}
    />
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';
