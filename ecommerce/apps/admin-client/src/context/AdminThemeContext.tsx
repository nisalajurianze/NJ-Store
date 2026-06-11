import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { readStorageItem, removeStorageItem, writeStorageItem } from '@njstore/utils';

export type AdminThemePreference = 'system' | 'dark' | 'light';

interface AdminThemeContextValue {
  isDark: boolean;
  themePreference: AdminThemePreference;
  cycleTheme: () => void;
}

const ADMIN_THEME_STORAGE_KEY = 'njstore-admin-theme';
const AdminThemeContext = createContext<AdminThemeContextValue | undefined>(undefined);

const readStoredPreference = (): AdminThemePreference => {
  const stored = readStorageItem(ADMIN_THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    return stored;
  }

  return 'system';
};

const getSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const AdminThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [themePreference, setThemePreference] = useState<AdminThemePreference>(() => readStoredPreference());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());
  const isDark = themePreference === 'system' ? systemPrefersDark : themePreference === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.adminTheme = isDark ? 'dark' : 'light';

    try {
      if (themePreference === 'system') {
        removeStorageItem(ADMIN_THEME_STORAGE_KEY);
        return;
      }

      writeStorageItem(ADMIN_THEME_STORAGE_KEY, themePreference);
    } catch {
      // Theme persistence should never block the admin workspace.
    }
  }, [isDark, themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent): void => setSystemPrefersDark(event.matches);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

  const value = useMemo(
    () => ({
      isDark,
      themePreference,
      cycleTheme: () => {
        setThemePreference((current) => {
          if (current === 'system') {
            return 'dark';
          }
          if (current === 'dark') {
            return 'light';
          }
          return 'system';
        });
      }
    }),
    [isDark, themePreference]
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
};

export const useAdminTheme = (): AdminThemeContextValue => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used inside AdminThemeProvider');
  }
  return context;
};
