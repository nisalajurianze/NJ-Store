export const subscribeToMediaQueryChange = (
  query: MediaQueryList,
  listener: (event: MediaQueryListEvent | MediaQueryList) => void
): (() => void) => {
  if (typeof query.addEventListener === 'function') {
    const handler = (event: MediaQueryListEvent): void => listener(event);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }

  const legacyHandler = (event: MediaQueryListEvent): void => listener(event);
  query.addListener(legacyHandler);
  return () => query.removeListener(legacyHandler);
};
