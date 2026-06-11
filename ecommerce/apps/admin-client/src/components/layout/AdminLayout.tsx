import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminNotificationCenterDto, AdminNotificationKind } from '@njstore/types';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Modal } from '@njstore/ui';
import { cn, motionTiming } from '@njstore/utils';
import { Bell, CheckCircle2, ClipboardCheck, Keyboard, MessageSquareText, MonitorSmartphone, MoonStar, PackageSearch, ReceiptText, RotateCcw, Star, SunMedium } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminNavigationSections, getAdminNavigationLinkByPath, getGroupedAdminNavigationLinks } from '../../config/adminNavigation';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminTheme } from '../../context/AdminThemeContext';
import { adminService } from '../../services/adminService';
import { AdminErrorBoundary } from '../system/AdminErrorBoundary';

type NavigationShortcutId = 'dashboard' | 'products' | 'orders' | 'users' | 'settings';
type ActionShortcutId = 'focusSearch' | 'openShortcuts' | 'cycleTheme' | 'clearSequence';

type NavigationShortcutBindings = Record<NavigationShortcutId, string>;
type ActionShortcutBindings = Record<ActionShortcutId, ActionShortcutBinding>;

interface ActionShortcutBinding {
  key: string;
  shift?: boolean;
}

const ADMIN_SHORTCUT_STORAGE_KEY = 'njstore-admin-navigation-shortcuts';
const ADMIN_NAVIGATION_PREFIX_STORAGE_KEY = 'njstore-admin-navigation-prefix';
const ADMIN_ACTION_SHORTCUT_STORAGE_KEY = 'njstore-admin-action-shortcuts';
const defaultNavigationShortcutPrefix = 'g';

const defaultNavigationShortcutBindings: NavigationShortcutBindings = {
  dashboard: 'd',
  products: 'p',
  orders: 'o',
  users: 'u',
  settings: 's'
};

const navigationShortcutConfigs: Array<{
  id: NavigationShortcutId;
  description: string;
  path: string;
}> = [
  { id: 'dashboard', description: 'Go to dashboard overview', path: '/dashboard' },
  { id: 'products', description: 'Open products', path: '/dashboard/products' },
  { id: 'orders', description: 'Open orders', path: '/dashboard/orders' },
  { id: 'users', description: 'Open users', path: '/dashboard/users' },
  { id: 'settings', description: 'Open settings', path: '/dashboard/settings' }
];

const defaultActionShortcutBindings: ActionShortcutBindings = {
  focusSearch: { key: '/' },
  openShortcuts: { key: '?' },
  cycleTheme: { key: 'd', shift: true },
  clearSequence: { key: 'escape' }
};

const actionShortcutConfigs: Array<{
  id: ActionShortcutId;
  description: string;
}> = [
  { id: 'focusSearch', description: 'Focus the current page search field' },
  { id: 'openShortcuts', description: 'Open this shortcuts panel' },
  { id: 'cycleTheme', description: 'Cycle admin theme' },
  { id: 'clearSequence', description: 'Clear a pending shortcut sequence' }
];

const notificationIconMap: Record<AdminNotificationKind, LucideIcon> = {
  order: ClipboardCheck,
  payment: ReceiptText,
  return: RotateCcw,
  inventory: PackageSearch,
  question: MessageSquareText,
  review: Star
};

const notificationPriorityClassName = {
  high: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
  medium: 'border-gold/25 bg-gold/10 text-gold',
  low: 'border-sky-300/20 bg-sky-300/10 text-sky-100'
} as const;

const formatNotificationCount = (count: number): string => (count > 99 ? '99+' : count.toLocaleString());
const adminNotificationQueryKey = ['admin-notifications', 'center'] as const;
type AdminNotificationCenterQueryData = Awaited<ReturnType<typeof adminService.notifications>>;

const dismissNotificationFromCenter = (
  center: AdminNotificationCenterDto,
  notificationId: string
): AdminNotificationCenterDto => {
  const dismissedItem = center.items.find((item) => item.id === notificationId);
  if (!dismissedItem) {
    return center;
  }

  return {
    ...center,
    items: center.items.filter((item) => item.id !== notificationId),
    totalCount: Math.max(0, center.totalCount - dismissedItem.count),
    highPriorityCount:
      dismissedItem.priority === 'high'
        ? Math.max(0, center.highPriorityCount - dismissedItem.count)
        : center.highPriorityCount,
    generatedAt: new Date().toISOString()
  };
};

const normalizeShortcutKey = (value: string): string => {
  if (value === ' ') {
    return ' ';
  }

  const normalizedValue = value.trim().toLowerCase();
  if (['esc', 'escape'].includes(normalizedValue)) {
    return 'escape';
  }
  if (normalizedValue === 'space') {
    return ' ';
  }
  return normalizedValue.slice(-1);
};

const formatShortcutKey = (key: string): string => {
  if (key === 'escape') {
    return 'Esc';
  }
  if (key === ' ') {
    return 'Space';
  }
  return key.toUpperCase();
};

const formatActionShortcut = (binding: ActionShortcutBinding): string =>
  [binding.shift ? 'Shift' : null, formatShortcutKey(binding.key)].filter(Boolean).join(' + ');

const getActionShortcutSignature = (binding: ActionShortcutBinding): string => `${binding.shift ? 'shift+' : ''}${binding.key}`;

const matchesShortcutBinding = (event: KeyboardEvent, binding: ActionShortcutBinding): boolean => {
  const eventKey = normalizeShortcutKey(event.key);
  const requiresShift = Boolean(binding.shift);
  const printableSymbol = !/^[a-z0-9]$/.test(binding.key);
  const shiftMatches = requiresShift ? event.shiftKey : !event.shiftKey || printableSymbol;

  return eventKey === binding.key && shiftMatches;
};

const readNavigationShortcutBindings = (): NavigationShortcutBindings => {
  if (typeof window === 'undefined') {
    return defaultNavigationShortcutBindings;
  }

  try {
    const storedValue = window.localStorage.getItem(ADMIN_SHORTCUT_STORAGE_KEY);
    if (!storedValue) {
      return defaultNavigationShortcutBindings;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<NavigationShortcutBindings>;
    return navigationShortcutConfigs.reduce<NavigationShortcutBindings>(
      (bindings, config) => ({
        ...bindings,
        [config.id]: normalizeShortcutKey(parsedValue[config.id] ?? defaultNavigationShortcutBindings[config.id])
      }),
      { ...defaultNavigationShortcutBindings }
    );
  } catch {
    return defaultNavigationShortcutBindings;
  }
};

const saveNavigationShortcutBindings = (bindings: NavigationShortcutBindings): void => {
  try {
    window.localStorage.setItem(ADMIN_SHORTCUT_STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Shortcut persistence should not block admin navigation.
  }
};

const readNavigationShortcutPrefix = (): string => {
  if (typeof window === 'undefined') {
    return defaultNavigationShortcutPrefix;
  }

  try {
    return normalizeShortcutKey(window.localStorage.getItem(ADMIN_NAVIGATION_PREFIX_STORAGE_KEY) ?? defaultNavigationShortcutPrefix) || defaultNavigationShortcutPrefix;
  } catch {
    return defaultNavigationShortcutPrefix;
  }
};

const saveNavigationShortcutPrefix = (prefix: string): void => {
  try {
    window.localStorage.setItem(ADMIN_NAVIGATION_PREFIX_STORAGE_KEY, prefix);
  } catch {
    // Shortcut persistence should not block admin navigation.
  }
};

const readActionShortcutBindings = (): ActionShortcutBindings => {
  if (typeof window === 'undefined') {
    return defaultActionShortcutBindings;
  }

  try {
    const storedValue = window.localStorage.getItem(ADMIN_ACTION_SHORTCUT_STORAGE_KEY);
    if (!storedValue) {
      return defaultActionShortcutBindings;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<ActionShortcutBindings>;
    return actionShortcutConfigs.reduce<ActionShortcutBindings>(
      (bindings, config) => {
        const storedBinding = parsedValue[config.id];
        const defaultBinding = defaultActionShortcutBindings[config.id];

        return {
          ...bindings,
          [config.id]: {
            key: normalizeShortcutKey(storedBinding?.key ?? defaultBinding.key),
            shift: Boolean(storedBinding?.shift ?? defaultBinding.shift)
          }
        };
      },
      { ...defaultActionShortcutBindings }
    );
  } catch {
    return defaultActionShortcutBindings;
  }
};

const saveActionShortcutBindings = (bindings: ActionShortcutBindings): void => {
  try {
    window.localStorage.setItem(ADMIN_ACTION_SHORTCUT_STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Shortcut persistence should not block admin actions.
  }
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

export const AdminLayout = (): JSX.Element => {
  const { logout } = useAdminAuth();
  const { accessibleLinks } = useAdminPermissions();
  const { cycleTheme, themePreference } = useAdminTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const groupedLinks = getGroupedAdminNavigationLinks(accessibleLinks);
  const activeLink = getAdminNavigationLinkByPath(location.pathname);
  const activeSectionLabel = activeLink ? adminNavigationSections[activeLink.section].label : null;
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);
  const [shortcutEditMessage, setShortcutEditMessage] = useState<string | null>(null);
  const [navigationShortcutPrefix, setNavigationShortcutPrefix] = useState(readNavigationShortcutPrefix);
  const [navigationShortcutBindings, setNavigationShortcutBindings] = useState<NavigationShortcutBindings>(readNavigationShortcutBindings);
  const [actionShortcutBindings, setActionShortcutBindings] = useState<ActionShortcutBindings>(readActionShortcutBindings);
  const [navigationShortcutPrefixDraft, setNavigationShortcutPrefixDraft] = useState(navigationShortcutPrefix);
  const [shortcutDraft, setShortcutDraft] = useState<NavigationShortcutBindings>(() => ({ ...navigationShortcutBindings }));
  const [actionShortcutDraft, setActionShortcutDraft] = useState<ActionShortcutBindings>(() => ({ ...actionShortcutBindings }));
  const [shortcutPrefix, setShortcutPrefix] = useState<string | null>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const shortcutTimeoutRef = useRef<number | null>(null);
  const adminNotifications = useQuery({
    queryKey: adminNotificationQueryKey,
    queryFn: () => adminService.notifications(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true
  });
  const markNotificationViewed = useMutation({
    mutationFn: (notificationId: string) => adminService.markNotificationViewed(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: adminNotificationQueryKey });
      const previous = queryClient.getQueryData<AdminNotificationCenterQueryData>(adminNotificationQueryKey);

      if (previous) {
        queryClient.setQueryData<AdminNotificationCenterQueryData>(adminNotificationQueryKey, {
          ...previous,
          data: dismissNotificationFromCenter(previous.data, notificationId)
        });
      }

      return { previous };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminNotificationQueryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(adminNotificationQueryKey, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminNotificationQueryKey });
    }
  });
  const notificationCenter = adminNotifications.data?.data;
  const notificationItems = notificationCenter?.items ?? [];
  const notificationTotalCount = notificationCenter?.totalCount ?? 0;

  const navigationShortcutMap = useMemo(
    () =>
      navigationShortcutConfigs.reduce<Record<string, string>>((map, config) => {
        map[navigationShortcutBindings[config.id]] = config.path;
        return map;
      }, {}),
    [navigationShortcutBindings]
  );

  const shortcutGroups = useMemo(
    () => [
      {
        title: 'Workspace',
        items: navigationShortcutConfigs.map((config) => ({
          kind: 'navigation' as const,
          id: config.id,
          keys: `${navigationShortcutPrefix} ${navigationShortcutBindings[config.id]}`,
          description: config.description,
          editable: true
        }))
      },
      {
        title: 'Actions',
        items: actionShortcutConfigs.map((config) => ({
          kind: 'action' as const,
          id: config.id,
          keys: formatActionShortcut(actionShortcutBindings[config.id]),
          description: config.description,
          editable: true
        }))
      }
    ],
    [actionShortcutBindings, navigationShortcutBindings, navigationShortcutPrefix]
  );

  const shortcutKeyHint = useMemo(
    () => navigationShortcutConfigs.map((config) => `\`${navigationShortcutBindings[config.id]}\``).join(', '),
    [navigationShortcutBindings]
  );

  const themePresentation = useMemo(() => {
    if (themePreference === 'system') {
      return {
        label: 'System theme',
        Icon: MonitorSmartphone
      };
    }

    if (themePreference === 'dark') {
      return {
        label: 'Dark theme',
        Icon: MoonStar
      };
    }

    return {
      label: 'Light theme',
      Icon: SunMedium
    };
  }, [themePreference]);

  useEffect(() => {
    const clearShortcutPrefix = (): void => {
      setShortcutPrefix(null);
      if (shortcutTimeoutRef.current !== null) {
        window.clearTimeout(shortcutTimeoutRef.current);
        shortcutTimeoutRef.current = null;
      }
    };

    const focusSearchField = (): void => {
      const searchInput = document.querySelector<HTMLInputElement>('[data-admin-search-input="true"]');
      if (!searchInput) {
        return;
      }

      searchInput.focus();
      searchInput.select();
    };

    const queueShortcutPrefixReset = (): void => {
      if (shortcutTimeoutRef.current !== null) {
        window.clearTimeout(shortcutTimeoutRef.current);
      }

      shortcutTimeoutRef.current = window.setTimeout(() => {
        setShortcutPrefix(null);
        shortcutTimeoutRef.current = null;
      }, 1200);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) {
        if (event.key === 'Escape' && event.target instanceof HTMLElement) {
          event.target.blur();
        }
        return;
      }

      if (matchesShortcutBinding(event, actionShortcutBindings.openShortcuts)) {
        event.preventDefault();
        clearShortcutPrefix();
        setIsShortcutModalOpen(true);
        return;
      }

      if (matchesShortcutBinding(event, actionShortcutBindings.focusSearch)) {
        event.preventDefault();
        clearShortcutPrefix();
        focusSearchField();
        return;
      }

      if (matchesShortcutBinding(event, actionShortcutBindings.cycleTheme)) {
        event.preventDefault();
        clearShortcutPrefix();
        cycleTheme();
        return;
      }

      if (matchesShortcutBinding(event, actionShortcutBindings.clearSequence)) {
        event.preventDefault();
        clearShortcutPrefix();
        return;
      }

      if (shortcutPrefix === navigationShortcutPrefix) {
        const shortcutPath = navigationShortcutMap[event.key.toLowerCase()];
        clearShortcutPrefix();

        if (shortcutPath) {
          event.preventDefault();
          navigate(shortcutPath);
        }
        return;
      }

      if (event.key.toLowerCase() === navigationShortcutPrefix) {
        event.preventDefault();
        setShortcutPrefix(navigationShortcutPrefix);
        queueShortcutPrefixReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (shortcutTimeoutRef.current !== null) {
        window.clearTimeout(shortcutTimeoutRef.current);
      }
    };
  }, [actionShortcutBindings, cycleTheme, navigate, navigationShortcutMap, navigationShortcutPrefix, shortcutPrefix]);

  useEffect(() => {
    setIsNotificationPanelOpen(false);
  }, [location.pathname, location.search]);

  const handleShortcutDraftChange = (id: NavigationShortcutId, value: string): void => {
    setShortcutEditMessage(null);
    setShortcutDraft((current) => ({
      ...current,
      [id]: normalizeShortcutKey(value)
    }));
  };

  const handleNavigationShortcutPrefixDraftChange = (value: string): void => {
    setShortcutEditMessage(null);
    setNavigationShortcutPrefixDraft(normalizeShortcutKey(value));
  };

  const handleActionShortcutDraftKeyChange = (id: ActionShortcutId, value: string): void => {
    setShortcutEditMessage(null);
    setActionShortcutDraft((current) => ({
      ...current,
      [id]: {
        ...current[id],
        key: normalizeShortcutKey(value)
      }
    }));
  };

  const handleActionShortcutDraftShiftChange = (id: ActionShortcutId, shift: boolean): void => {
    setShortcutEditMessage(null);
    setActionShortcutDraft((current) => ({
      ...current,
      [id]: {
        ...current[id],
        shift
      }
    }));
  };

  const handleSaveShortcutDraft = (): void => {
    const navigationKeys = navigationShortcutConfigs.map((config) => shortcutDraft[config.id]);
    const actionBindings = actionShortcutConfigs.map((config) => actionShortcutDraft[config.id]);
    const actionSignatures = actionBindings.map(getActionShortcutSignature);
    const hasInvalidNavigationPrefix = !/^[a-z0-9]$/.test(navigationShortcutPrefixDraft);
    const hasInvalidNavigationKey = navigationKeys.some((key) => !/^[a-z0-9]$/.test(key));
    const hasInvalidActionKey = actionBindings.some((binding) => !binding.key || (binding.key !== 'escape' && binding.key !== ' ' && !/^[a-z0-9/?]$/.test(binding.key)));

    if (hasInvalidNavigationPrefix || hasInvalidNavigationKey || hasInvalidActionKey) {
      setShortcutEditMessage('Use one letter, number, /, ?, Space, or Esc for each shortcut.');
      return;
    }

    if (new Set(navigationKeys).size !== navigationKeys.length || new Set(actionSignatures).size !== actionSignatures.length) {
      setShortcutEditMessage('Each shortcut in the same section needs to be unique.');
      return;
    }

    const actionBlocksNavigationPrefix = actionBindings.some((binding) => binding.key === navigationShortcutPrefixDraft && !binding.shift);
    if (actionBlocksNavigationPrefix) {
      setShortcutEditMessage(`Action shortcuts cannot use ${formatShortcutKey(navigationShortcutPrefixDraft)} because it starts workspace navigation.`);
      return;
    }

    setNavigationShortcutPrefix(navigationShortcutPrefixDraft);
    setNavigationShortcutBindings(shortcutDraft);
    setActionShortcutBindings(actionShortcutDraft);
    saveNavigationShortcutPrefix(navigationShortcutPrefixDraft);
    saveNavigationShortcutBindings(shortcutDraft);
    saveActionShortcutBindings(actionShortcutDraft);
    setIsEditingShortcuts(false);
    setShortcutEditMessage('Shortcuts updated.');
  };

  const handleResetShortcutDraft = (): void => {
    setNavigationShortcutPrefixDraft(defaultNavigationShortcutPrefix);
    setShortcutDraft({ ...defaultNavigationShortcutBindings });
    setActionShortcutDraft({ ...defaultActionShortcutBindings });
    setNavigationShortcutPrefix(defaultNavigationShortcutPrefix);
    setNavigationShortcutBindings({ ...defaultNavigationShortcutBindings });
    setActionShortcutBindings({ ...defaultActionShortcutBindings });
    saveNavigationShortcutPrefix(defaultNavigationShortcutPrefix);
    saveNavigationShortcutBindings(defaultNavigationShortcutBindings);
    saveActionShortcutBindings(defaultActionShortcutBindings);
    setShortcutEditMessage('Shortcuts reset.');
    setIsEditingShortcuts(false);
  };

  return (
    <div className="page-shell overflow-x-clip py-4 lg:!px-0 lg:py-2 xl:!px-0 2xl:!px-0">
      <div className="grid min-w-0 gap-4 lg:h-[calc(100dvh-1rem)] lg:grid-cols-[224px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[248px_minmax(0,1fr)]">
        <AdminErrorBoundary level="widget" title="Admin navigation failed to render.">
          <aside className="admin-sidebar-shell relative flex max-h-[min(72dvh,42rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,26,46,0.96),rgba(11,20,37,0.94))] shadow-[0_24px_56px_rgba(0,0,0,0.3)] lg:h-full lg:max-h-none">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.13),transparent_30%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />

            <div className="relative z-[1] flex h-full flex-col p-3">
              <Link
                to="/dashboard"
                className="mb-3 flex items-center justify-center rounded-[24px] border border-gold/25 bg-[linear-gradient(135deg,rgba(242,206,58,0.98),rgba(212,175,55,0.92))] px-3 py-3.5 text-center shadow-[0_14px_28px_rgba(212,175,55,0.16)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"
              >
                <span className="font-display text-[1.45rem] leading-none tracking-[-0.04em] text-[#143866] sm:text-[1.6rem]">NJ Store</span>
              </Link>

              <nav className="admin-scrollbar relative z-[1] min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                {groupedLinks.map((group) => (
                  <section key={group.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    {group.id !== 'workspace' ? (
                      <p className="px-2 pb-1 text-[8px] uppercase tracking-[0.26em] text-gold">{group.label}</p>
                    ) : null}

                    <div className="space-y-1">
                      {group.links.map((link) => {
                        const Icon = link.icon;
                        const isLinkActive = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);

                        return (
                          <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/dashboard'}
                            className={({ isActive }) =>
                              cn(
                                'group block rounded-[14px] border px-2.5 py-2.5 transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                                isActive
                                  ? 'border-gold/30 bg-gold text-dark shadow-[0_12px_24px_rgba(212,175,55,0.16)]'
                                  : 'border-transparent bg-transparent text-gray-200 hover:border-white/10 hover:bg-white/[0.05] hover:text-white'
                              )
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full border p-1.5 transition-colors duration-200',
                                  isLinkActive ? 'border-black/10 bg-black/10' : 'border-white/10 bg-black/10 group-hover:border-white/15'
                                )}
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-[0.8rem] font-semibold">{link.label}</p>
                                  {isLinkActive ? <span className="h-2 w-2 shrink-0 rounded-full bg-dark" aria-hidden="true" /> : null}
                                </div>
                              </div>
                            </div>
                          </NavLink>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {accessibleLinks.length === 0 ? (
                  <p className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-5 py-6 text-[0.97rem] leading-[1.8] text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    This account is active, but it does not currently have any admin page access.
                  </p>
                ) : null}
              </nav>

              <div className="relative z-[1] mt-2.5">
                <Button
                  variant="secondary"
                  className="h-12 w-full rounded-[18px] text-[0.9rem] font-semibold"
                  onClick={() => void logout()}
                >
                  Logout
                </Button>
              </div>
            </div>
          </aside>
        </AdminErrorBoundary>

          <AdminErrorBoundary level="widget" title="This admin workspace panel is unavailable.">
            <section className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
                <div className="admin-topbar-shell sticky top-0 z-20 rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(18,31,56,0.92),rgba(14,22,40,0.9))] px-3 py-2.5 shadow-[0_14px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-4 sm:py-3">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      {activeSectionLabel ? (
                        <p className="text-[8px] uppercase tracking-[0.22em] text-gold">{activeSectionLabel}</p>
                      ) : null}
                      <p className="mt-1 truncate font-display text-[0.95rem] leading-tight text-white">
                        {activeLink?.label ?? 'Access limited'}
                      </p>
                      {!activeLink ? (
                        <p className="mt-2 text-xs text-gray-400">
                          Your admin account is signed in, but it does not have permission to open this area yet.
                        </p>
                      ) : null}
                      {shortcutPrefix ? (
                        <p className="mt-2 text-xs text-gray-400">
                          Shortcut mode active. Press {shortcutKeyHint}.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                      <div
                        className="relative flex-1 sm:flex-none"
                        onBlurCapture={(event) => {
                          const nextTarget = event.relatedTarget;
                          if (!nextTarget || !event.currentTarget.contains(nextTarget as Node)) {
                            setIsNotificationPanelOpen(false);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className={cn(
                            'relative flex h-9 w-full items-center justify-center gap-2 rounded-[12px] border px-2.5 text-[0.78rem] font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px sm:h-10 sm:w-auto sm:rounded-[14px] sm:px-3.5 sm:text-[0.84rem]',
                            isNotificationPanelOpen
                              ? 'border-gold/35 bg-gold/15 text-white shadow-[0_14px_28px_rgba(212,175,55,0.16)]'
                              : 'border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/16 hover:bg-white/[0.07] hover:text-white'
                          )}
                          aria-label={`Admin alerts${notificationTotalCount ? ` (${notificationTotalCount})` : ''}`}
                          aria-expanded={isNotificationPanelOpen}
                          onClick={() => setIsNotificationPanelOpen((current) => !current)}
                        >
                          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                          Alerts
                          {notificationTotalCount ? (
                            <span className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full border border-[#121f38] bg-gold px-1.5 text-center text-[10px] font-black leading-5 text-dark shadow-[0_8px_18px_rgba(212,175,55,0.24)]">
                              {formatNotificationCount(notificationTotalCount)}
                            </span>
                          ) : null}
                        </button>

                        <AnimatePresence>
                          {isNotificationPanelOpen ? (
                            <motion.div
                              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                              exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.985 }}
                              transition={reduceMotion ? undefined : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                              className="fixed inset-x-3 top-[6.25rem] z-40 max-h-[calc(100dvh-8rem)] w-auto overflow-hidden rounded-[22px] border border-white/10 bg-[#081121] shadow-[0_28px_70px_rgba(0,0,0,0.42)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.65rem)] sm:max-h-none sm:w-[min(24rem,calc(100vw-1.5rem))]"
                            >
                              <div className="border-b border-white/10 bg-white/[0.035] px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white">Admin alerts</p>
                                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
                                      {notificationTotalCount ? `${notificationTotalCount.toLocaleString()} active` : 'All clear'}
                                    </p>
                                  </div>
                                  {notificationCenter?.highPriorityCount ? (
                                    <span className="shrink-0 rounded-full border border-rose-300/25 bg-rose-300/10 px-2.5 py-1 text-xs font-semibold text-rose-100">
                                      {notificationCenter.highPriorityCount.toLocaleString()} urgent
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {adminNotifications.isPending ? (
                                <div className="space-y-2.5 px-4 py-4">
                                  {Array.from({ length: 3 }, (_, index) => (
                                    <div key={index} className="h-16 animate-pulse rounded-[18px] border border-white/10 bg-white/[0.04]" />
                                  ))}
                                </div>
                              ) : adminNotifications.isError ? (
                                <div className="px-4 py-5 text-sm leading-6 text-gray-400">Alerts are unavailable right now.</div>
                              ) : notificationItems.length ? (
                                <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto py-2 sm:max-h-[24rem]">
                                  {notificationItems.map((item) => {
                                    const Icon = notificationIconMap[item.kind];

                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => {
                                          setIsNotificationPanelOpen(false);
                                          markNotificationViewed.mutate(item.id);
                                          navigate(item.href);
                                        }}
                                        className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-[background-color] duration-200 hover:bg-white/[0.05]"
                                      >
                                        <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border', notificationPriorityClassName[item.priority])}>
                                          <Icon className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="flex items-start justify-between gap-3">
                                            <span className="min-w-0">
                                              <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                                              <span className="mt-1 block text-sm leading-6 text-gray-400">{item.body}</span>
                                            </span>
                                            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs font-semibold text-white">
                                              {formatNotificationCount(item.count)}
                                            </span>
                                          </span>
                                          <span className="mt-2 inline-flex text-xs font-semibold text-gold group-hover:text-yellow-200">{item.actionLabel}</span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="px-4 py-6 text-center">
                                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                  <p className="mt-3 text-sm font-semibold text-white">Nothing needs attention</p>
                                  <p className="mt-1 text-sm leading-6 text-gray-400">Orders, stock, questions, returns, and reviews are quiet.</p>
                                </div>
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 flex-1 rounded-[12px] px-2.5 text-[0.78rem] font-semibold sm:h-10 sm:flex-none sm:rounded-[14px] sm:px-3.5 sm:text-[0.84rem]"
                        onClick={() => setIsShortcutModalOpen(true)}
                      >
                        <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                        Shortcuts
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 flex-1 rounded-[12px] px-2.5 text-[0.78rem] font-semibold sm:h-10 sm:flex-none sm:rounded-[14px] sm:px-3.5 sm:text-[0.84rem]"
                        onClick={cycleTheme}
                      >
                        <themePresentation.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {themePresentation.label}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="admin-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${location.pathname}${location.search}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                      transition={reduceMotion ? undefined : motionTiming.page}
                      className="flex min-h-full flex-col pb-4"
                    >
                      <div className="admin-content-scale min-w-0">
                        <Outlet />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </AdminErrorBoundary>
      </div>

      <Modal isOpen={isShortcutModalOpen} onClose={() => setIsShortcutModalOpen(false)} title="Keyboard Shortcuts" size="md">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-6 text-gray-300">
              Keyboard support is available across the admin workspace for quick navigation, faster search focus, and theme control.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-9 rounded-[14px] px-3 text-[0.8rem] font-semibold"
                onClick={() => {
                  setNavigationShortcutPrefixDraft(navigationShortcutPrefix);
                  setShortcutDraft({ ...navigationShortcutBindings });
                  setActionShortcutDraft({ ...actionShortcutBindings });
                  setShortcutEditMessage(null);
                  setIsEditingShortcuts((current) => !current);
                }}
              >
                {isEditingShortcuts ? 'Cancel' : 'Edit'}
              </Button>
              {isEditingShortcuts ? (
                <Button size="sm" className="h-9 rounded-[14px] px-3 text-[0.8rem] font-semibold" onClick={handleSaveShortcutDraft}>
                  Save
                </Button>
              ) : null}
            </div>
          </div>

          {shortcutEditMessage ? (
            <p className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300">{shortcutEditMessage}</p>
          ) : null}

          {shortcutGroups.map((group) => (
            <section key={group.title} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{group.title}</p>
                {isEditingShortcuts ? (
                  <button type="button" className="text-xs font-semibold text-gray-300 hover:text-white" onClick={handleResetShortcutDraft}>
                    Reset
                  </button>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <div key={item.description} className="flex items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-black/10 px-3 py-2.5">
                    <span className="text-sm text-gray-300">{item.description}</span>
                    {item.kind === 'navigation' && isEditingShortcuts ? (
                      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white">
                        <input
                          aria-label="Workspace shortcut prefix key"
                          className="h-7 w-8 rounded-full border border-white/10 bg-black/20 text-center text-xs font-semibold uppercase text-white outline-none focus:border-gold"
                          maxLength={1}
                          value={navigationShortcutPrefixDraft}
                          onChange={(event) => handleNavigationShortcutPrefixDraftChange(event.target.value)}
                        />
                        <input
                          aria-label={`${item.description} shortcut key`}
                          className="h-7 w-8 rounded-full border border-white/10 bg-black/20 text-center text-xs font-semibold uppercase text-white outline-none focus:border-gold"
                          maxLength={1}
                          value={shortcutDraft[item.id]}
                          onChange={(event) => handleShortcutDraftChange(item.id, event.target.value)}
                        />
                      </label>
                    ) : item.kind === 'action' && isEditingShortcuts ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <label className="flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-300">
                          <input
                            type="checkbox"
                            className="h-3 w-3 accent-gold"
                            checked={Boolean(actionShortcutDraft[item.id].shift)}
                            onChange={(event) => handleActionShortcutDraftShiftChange(item.id, event.target.checked)}
                          />
                          Shift
                        </label>
                        <input
                          aria-label={`${item.description} shortcut key`}
                          className="h-9 w-16 rounded-full border border-white/10 bg-white/[0.04] text-center text-xs font-semibold uppercase text-white outline-none focus:border-gold"
                          value={formatShortcutKey(actionShortcutDraft[item.id].key)}
                          onKeyDown={(event) => {
                            if (event.key === 'Tab') {
                              return;
                            }

                            event.preventDefault();
                            event.stopPropagation();
                            if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
                              return;
                            }

                            handleActionShortcutDraftKeyChange(item.id, ['Backspace', 'Delete'].includes(event.key) ? '' : event.key);
                          }}
                          onChange={(event) => handleActionShortcutDraftKeyChange(item.id, event.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                        {item.keys}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Modal>
    </div>
  );
};
