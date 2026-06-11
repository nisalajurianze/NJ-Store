import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AuthPayloadDto, UserSummary } from '@njstore/types';
import {
  isTransientRefreshFailure,
  readStorageItem,
  readStorageJson,
  removeStorageItem,
  waitForRefreshRetry,
  writeStorageItem
} from '@njstore/utils';
import { authService } from '../services/authService';
import { registerRefreshHandler, setAccessToken } from '../services/api';

interface AdminAuthState {
  user: UserSummary | null;
  accessToken: string | null;
  loading: boolean;
}

type AdminAuthAction =
  | { type: 'start' }
  | { type: 'set'; payload: AuthPayloadDto }
  | { type: 'clear' };

const reducer = (state: AdminAuthState, action: AdminAuthAction): AdminAuthState => {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true };
    case 'set':
      return {
        user: action.payload.user,
        accessToken: action.payload.tokens.accessToken,
        loading: false
      };
    case 'clear':
      return { user: null, accessToken: null, loading: false };
    default:
      return state;
  }
};

interface AdminAuthContextValue extends AdminAuthState {
  login: (payload: { email: string; password: string; rememberMe?: boolean }) => Promise<void>;
  googleLogin: (payload: { credential: string; rememberMe?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const INITIAL_ADMIN_BOOTSTRAP_QUERY_KEY = ['admin-auth', 'initial-bootstrap'] as const;
const ADMIN_AUTH_SESSION_MARKER_KEY = 'njstore:admin-auth-session';
const ADMIN_AUTH_SESSION_SNAPSHOT_KEY = 'njstore:admin-auth-session-snapshot';

interface StoredAdminAuthSnapshot {
  payload: AuthPayloadDto;
  expiresAt: number;
}

const hasWorkspaceAccess = (
  payload: AuthPayloadDto | null | undefined
): payload is AuthPayloadDto & { user: UserSummary & { role: 'admin' | 'staff' } } =>
  Boolean(payload && (payload.user.role === 'admin' || payload.user.role === 'staff'));

const readAdminAuthSnapshot = (): AuthPayloadDto | null => {
  const snapshot = readStorageJson<StoredAdminAuthSnapshot | null>(ADMIN_AUTH_SESSION_SNAPSHOT_KEY, null, 'session');
  if (!snapshot || snapshot.expiresAt <= Date.now() || !hasWorkspaceAccess(snapshot.payload)) {
    removeStorageItem(ADMIN_AUTH_SESSION_SNAPSHOT_KEY, 'session');
    return null;
  }

  return snapshot.payload;
};

const markAdminSessionAvailable = (): void => {
  writeStorageItem(ADMIN_AUTH_SESSION_MARKER_KEY, '1');
};

const hasAdminSessionMarker = (): boolean => readStorageItem(ADMIN_AUTH_SESSION_MARKER_KEY) === '1';

const writeAdminAuthSnapshot = (payload: AuthPayloadDto): void => {
  if (!hasWorkspaceAccess(payload)) {
    removeStorageItem(ADMIN_AUTH_SESSION_MARKER_KEY);
    removeStorageItem(ADMIN_AUTH_SESSION_SNAPSHOT_KEY, 'session');
    return;
  }

  writeStorageItem(
    ADMIN_AUTH_SESSION_SNAPSHOT_KEY,
    JSON.stringify({
      payload,
      expiresAt: Date.now() + payload.tokens.expiresIn * 1000
    }),
    'session'
  );
};

const clearAdminAuthSnapshot = (): void => {
  removeStorageItem(ADMIN_AUTH_SESSION_MARKER_KEY);
  removeStorageItem(ADMIN_AUTH_SESSION_SNAPSHOT_KEY, 'session');
};

const buildAdminAuthStateFromPayload = (payload: AuthPayloadDto): AdminAuthState => ({
  user: payload.user,
  accessToken: payload.tokens.accessToken,
  loading: false
});

const createInitialAdminAuthState = (): AdminAuthState => {
  const payload = readAdminAuthSnapshot();

  return payload
    ? buildAdminAuthStateFromPayload(payload)
    : {
        user: null,
        accessToken: null,
        loading: hasAdminSessionMarker()
      };
};

const loadInitialAdminPayload = async (
  queryClient: QueryClient,
  storedPayload: AuthPayloadDto | null,
  shouldAttemptRefresh: boolean
): Promise<AuthPayloadDto | null> =>
  shouldAttemptRefresh
    ? queryClient.fetchQuery({
        queryKey: INITIAL_ADMIN_BOOTSTRAP_QUERY_KEY,
        staleTime: 5_000,
        gcTime: 15_000,
        queryFn: () =>
          authService
          .refresh()
          .catch(() => storedPayload)
      })
    : null;

const storeAdminAuth = (payload: AuthPayloadDto, dispatch: Dispatch<AdminAuthAction>): void => {
  markAdminSessionAvailable();
  writeAdminAuthSnapshot(payload);
  setAccessToken(payload.tokens.accessToken);
  dispatch({ type: 'set', payload });
};

export const AdminAuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reducer, undefined, createInitialAdminAuthState);

  useLayoutEffect(() => {
    if (!state.accessToken) {
      return;
    }

    setAccessToken(state.accessToken);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const payload = await authService.refresh();
      if (!hasWorkspaceAccess(payload)) {
        throw new Error('Forbidden');
      }
      storeAdminAuth(payload, dispatch);
      return payload.tokens.accessToken;
    } catch (error) {
      if (isTransientRefreshFailure(error)) {
        try {
          await waitForRefreshRetry();
          const payload = await authService.refresh();
          if (!hasWorkspaceAccess(payload)) {
            throw new Error('Forbidden');
          }
          storeAdminAuth(payload, dispatch);
          return payload.tokens.accessToken;
        } catch (retryError) {
          if (isTransientRefreshFailure(retryError) && state.accessToken) {
            return state.accessToken;
          }
        }
      }
    }

    clearAdminAuthSnapshot();
    setAccessToken(null);
    dispatch({ type: 'clear' });
    return null;
  }, [state.accessToken]);

  useEffect(() => {
    registerRefreshHandler(refreshSession);
    return () => registerRefreshHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    let isCancelled = false;
    const storedPayload = readAdminAuthSnapshot();
    const shouldAttemptRefresh = Boolean(storedPayload || hasAdminSessionMarker());

    void (async () => {
      const payload = await loadInitialAdminPayload(queryClient, storedPayload, shouldAttemptRefresh);
      if (isCancelled) {
        return;
      }

      if (!hasWorkspaceAccess(payload)) {
        clearAdminAuthSnapshot();
        setAccessToken(null);
        dispatch({ type: 'clear' });
        return;
      }

      storeAdminAuth(payload, dispatch);
    })();

    return () => {
      isCancelled = true;
    };
  }, [queryClient]);

  const login = useCallback<AdminAuthContextValue['login']>(async (payload) => {
    dispatch({ type: 'start' });
    const auth = await authService.login(payload);
    if (!hasWorkspaceAccess(auth)) {
      throw new Error('Workspace access required');
    }
    storeAdminAuth(auth, dispatch);
  }, []);

  const googleLogin = useCallback<AdminAuthContextValue['googleLogin']>(async (payload) => {
    dispatch({ type: 'start' });
    const auth = await authService.googleLogin({ ...payload, workspaceAccess: true });
    if (!hasWorkspaceAccess(auth)) {
      throw new Error('Workspace access required');
    }
    storeAdminAuth(auth, dispatch);
  }, []);

  const logout = useCallback<AdminAuthContextValue['logout']>(async () => {
    await authService.logout();
    clearAdminAuthSnapshot();
    setAccessToken(null);
    dispatch({ type: 'clear' });
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      ...state,
      login,
      googleLogin,
      logout,
      refreshSession
    }),
    [googleLogin, login, logout, refreshSession, state]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = (): AdminAuthContextValue => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};
