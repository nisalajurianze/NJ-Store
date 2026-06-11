import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { readStorageItem, removeStorageItem, writeStorageItem } from '../utils/browserStorage';
import { subscribeToMediaQueryChange } from '../utils/mediaQuery';

export type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeContextValue {
  isDark: boolean;
  themePreference: ThemePreference;
  setTheme: (mode: ThemePreference) => void;
  cycleTheme: () => void;
}

const THEME_STORAGE_KEY = 'njstore-theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const readStoredPreference = (): ThemePreference => {
  const stored = readStorageItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    return stored;
  }

  return 'system';
};

const getSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => readStoredPreference());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());
  const isDark = themePreference === 'system' ? systemPrefersDark : themePreference === 'dark';
  const setTheme = useCallback((mode: ThemePreference): void => {
    setThemePreference(mode);
  }, []);
  const cycleTheme = useCallback((): void => {
    setThemePreference((current) => {
      if (current === 'system') {
        return 'dark';
      }
      if (current === 'dark') {
        return 'light';
      }
      return 'system';
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.theme = isDark ? 'dark' : 'light';

    if (themePreference === 'system') {
      removeStorageItem(THEME_STORAGE_KEY);
      return;
    }

    writeStorageItem(THEME_STORAGE_KEY, themePreference);
  }, [isDark, themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    return subscribeToMediaQueryChange(media, (event) => {
      setSystemPrefersDark(event.matches);
    });
  }, []);

  const value = useMemo(
    () => ({
      isDark,
      themePreference,
      setTheme,
      cycleTheme
    }),
    [cycleTheme, isDark, setTheme, themePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
};
