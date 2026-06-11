import { useEffect, useState } from 'react';
import { readStorageJson, writeStorageItem } from '../utils/browserStorage';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => readStorageJson<T>(key, initialValue));

  useEffect(() => {
    writeStorageItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};
