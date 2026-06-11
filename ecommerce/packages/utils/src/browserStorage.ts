type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type StorageArea = 'local' | 'session';

const getStorage = (area: StorageArea): BrowserStorage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = area === 'local' ? window.localStorage : window.sessionStorage;

    if (
      typeof storage?.getItem === 'function' &&
      typeof storage?.setItem === 'function' &&
      typeof storage?.removeItem === 'function'
    ) {
      return storage;
    }
  } catch {
    return null;
  }

  return null;
};

export const readStorageItem = (key: string, area: StorageArea = 'local'): string | null => {
  const storage = getStorage(area);
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorageItem = (key: string, value: string, area: StorageArea = 'local'): boolean => {
  const storage = getStorage(area);
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeStorageItem = (key: string, area: StorageArea = 'local'): boolean => {
  const storage = getStorage(area);
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const readStorageJson = <T>(key: string, fallback: T, area: StorageArea = 'local'): T => {
  const stored = readStorageItem(key, area);
  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
};
