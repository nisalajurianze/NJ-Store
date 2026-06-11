const getStorage = (area) => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const storage = area === 'local' ? window.localStorage : window.sessionStorage;
        if (typeof storage?.getItem === 'function' &&
            typeof storage?.setItem === 'function' &&
            typeof storage?.removeItem === 'function') {
            return storage;
        }
    }
    catch {
        return null;
    }
    return null;
};
export const readStorageItem = (key, area = 'local') => {
    const storage = getStorage(area);
    if (!storage) {
        return null;
    }
    try {
        return storage.getItem(key);
    }
    catch {
        return null;
    }
};
export const writeStorageItem = (key, value, area = 'local') => {
    const storage = getStorage(area);
    if (!storage) {
        return false;
    }
    try {
        storage.setItem(key, value);
        return true;
    }
    catch {
        return false;
    }
};
export const removeStorageItem = (key, area = 'local') => {
    const storage = getStorage(area);
    if (!storage) {
        return false;
    }
    try {
        storage.removeItem(key);
        return true;
    }
    catch {
        return false;
    }
};
export const readStorageJson = (key, fallback, area = 'local') => {
    const stored = readStorageItem(key, area);
    if (!stored) {
        return fallback;
    }
    try {
        return JSON.parse(stored);
    }
    catch {
        return fallback;
    }
};
