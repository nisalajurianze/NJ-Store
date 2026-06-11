const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /expected a javascript-or-wasm module script/i,
  /chunkloaderror/i,
  /loading chunk \d+ failed/i
] as const;

const CHUNK_RELOAD_STORAGE_PREFIX = 'njstore:chunk-reload';

const getErrorText = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }

  return typeof error === 'string' ? error : '';
};

const getCurrentAssetSignature = (): string => {
  if (typeof document === 'undefined') {
    return 'server';
  }

  const scriptSignature = Array.from(document.scripts)
    .map((script) => script.src)
    .find((src) => src.includes('/assets/') && src.endsWith('.js'));

  return scriptSignature || `${window.location.origin}${window.location.pathname}`;
};

export const isChunkLoadError = (error: unknown): boolean => {
  const errorText = getErrorText(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(errorText));
};

export const recoverFromChunkLoadError = (error: unknown, source = 'chunk'): boolean => {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) {
    return false;
  }

  const reloadKey = `${CHUNK_RELOAD_STORAGE_PREFIX}:${getCurrentAssetSignature()}`;

  try {
    if (window.sessionStorage.getItem(reloadKey) === '1') {
      return false;
    }

    window.sessionStorage.setItem(reloadKey, '1');
    window.sessionStorage.setItem(`${reloadKey}:source`, source);
  } catch {
    return false;
  }

  window.location.reload();
  return true;
};

export const withChunkRecovery = async <T>(loader: () => Promise<T>, source: string): Promise<T> => {
  try {
    return await loader();
  } catch (error) {
    recoverFromChunkLoadError(error, source);
    throw error;
  }
};
