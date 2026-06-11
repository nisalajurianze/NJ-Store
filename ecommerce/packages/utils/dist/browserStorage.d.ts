export type StorageArea = 'local' | 'session';
export declare const readStorageItem: (key: string, area?: StorageArea) => string | null;
export declare const writeStorageItem: (key: string, value: string, area?: StorageArea) => boolean;
export declare const removeStorageItem: (key: string, area?: StorageArea) => boolean;
export declare const readStorageJson: <T>(key: string, fallback: T, area?: StorageArea) => T;
