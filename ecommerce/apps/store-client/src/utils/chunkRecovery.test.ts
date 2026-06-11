import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, recoverFromChunkLoadError, withChunkRecovery } from './chunkRecovery';

const createMemoryStorage = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      values.set(key, value);
    }
  };
};

const stubBrowserRuntime = (scriptSrc = 'https://store.example/assets/index-abc123.js') => {
  const reload = vi.fn();
  const sessionStorage = createMemoryStorage();

  vi.stubGlobal('window', {
    location: {
      origin: 'https://store.example',
      pathname: '/',
      reload
    },
    sessionStorage
  });
  vi.stubGlobal('document', {
    scripts: [{ src: scriptSrc }]
  });

  return { reload, sessionStorage };
};

describe('chunk recovery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recognizes stale dynamic import failures from modern bundlers and browsers', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/Home-old.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 42 failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Expected a JavaScript-or-Wasm module script but the server responded with text/html'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('reloads only once for the active asset signature even when different sources report the chunk failure', () => {
    const { reload, sessionStorage } = stubBrowserRuntime();
    const error = new TypeError('Failed to fetch dynamically imported module: https://store.example/assets/Home-old.js');
    const reloadKey = 'njstore:chunk-reload:https://store.example/assets/index-abc123.js';

    expect(recoverFromChunkLoadError(error, 'home-route')).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(reloadKey)).toBe('1');
    expect(sessionStorage.getItem(`${reloadKey}:source`)).toBe('home-route');

    expect(recoverFromChunkLoadError(error, 'error-boundary-page')).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(`${reloadKey}:source`)).toBe('home-route');
  });

  it('rethrows loader failures after requesting recovery', async () => {
    const { reload } = stubBrowserRuntime();
    const error = new Error('ChunkLoadError: Loading chunk home failed');

    await expect(withChunkRecovery(() => Promise.reject(error), 'home-route')).rejects.toThrow(error);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
