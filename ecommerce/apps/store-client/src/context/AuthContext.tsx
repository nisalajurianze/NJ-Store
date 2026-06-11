import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type PropsWithChildren
} from 'react';
import { useTranslation } from 'react-i18next';
import type { AddressDto, AuthPayloadDto, SessionDto, ShopPreferencesDto, UserSummary } from '@njstore/types';
import { isTransientRefreshFailure, waitForRefreshRetry } from '@njstore/utils';
import { authService } from '../services/authService';
import { registerRefreshHandler, setAccessToken } from '../services/api';
import { disableGoogleAutoSelect } from '../utils/googleIdentity';
import { readStorageItem, readStorageJson, removeStorageItem, writeStorageItem } from '../utils/browserStorage';

interface AuthState {
  user: UserSummary | null;
  addresses: AddressDto[];
  sessions: SessionDto[];
  accessToken: string | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'start' }
  | { type: 'set'; payload: AuthPayloadDto }
  | { type: 'clear' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true };
    case 'set':
      return {
        user: action.payload.user,
        addresses: action.payload.addresses,
        sessions: action.payload.sessions,
        accessToken: action.payload.tokens.accessToken,
        loading: false
      };
    case 'clear':
      return {
        user: null,
        addresses: [],
        sessions: [],
        accessToken: null,
        loading: false
      };
    default:
      return state;
  }
};

interface AuthContextValue extends AuthState {
  login: (payload: { email: string; password: string; rememberMe?: boolean }) => Promise<void>;
  googleLogin: (payload: { credential: string; rememberMe?: boolean }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; phone?: string; language?: 'en' | 'si' }) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  updateProfile: (payload: {
    name?: string;
    phone?: string;
    language?: 'en' | 'si';
    shopPreferences?: { myFilters?: ShopPreferencesDto['myFilters'] | null };
  }) => Promise<void>;
  updatePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  addAddress: (payload: Record<string, unknown>) => Promise<void>;
  updateAddress: (addressId: string, payload: Record<string, unknown>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_SESSION_MARKER_KEY = 'njstore:auth-session';
const AUTH_SESSION_SNAPSHOT_KEY = 'njstore:auth-session-snapshot';
const INITIAL_AUTH_BOOTSTRAP_DEDUPE_MS = 5_000;

interface StoredAuthSnapshot {
  payload: AuthPayloadDto;
  expiresAt: number;
}

type InitialAuthBootstrapResult =
  | {
      payload: AuthPayloadDto;
      source: 'refresh' | 'snapshot';
    }
  | null;

const initialAuthBootstrapByScope = new Map<string, { promise: Promise<InitialAuthBootstrapResult>; expiresAt: number }>();

const markSessionAvailable = (): void => {
  writeStorageItem(AUTH_SESSION_MARKER_KEY, '1');
};

const hasSessionMarker = (): boolean => {
  if (readStorageItem(AUTH_SESSION_MARKER_KEY) === '1') {
    return true;
  }

  return readStorageItem(AUTH_SESSION_MARKER_KEY, 'session') === '1';
};

const clearSessionMarker = (): void => {
  removeStorageItem(AUTH_SESSION_MARKER_KEY);
  removeStorageItem(AUTH_SESSION_MARKER_KEY, 'session');
};

const readAuthSnapshot = (): AuthPayloadDto | null => {
  const snapshot = readStorageJson<StoredAuthSnapshot | null>(AUTH_SESSION_SNAPSHOT_KEY, null, 'session');
  if (!snapshot || snapshot.expiresAt <= Date.now()) {
    removeStorageItem(AUTH_SESSION_SNAPSHOT_KEY, 'session');
    return null;
  }

  return snapshot.payload;
};

const writeAuthSnapshot = (payload: AuthPayloadDto): void => {
  writeStorageItem(
    AUTH_SESSION_SNAPSHOT_KEY,
    JSON.stringify({
      payload,
      expiresAt: Date.now() + payload.tokens.expiresIn * 1000
    }),
    'session'
  );
};

const clearAuthSnapshot = (): void => {
  removeStorageItem(AUTH_SESSION_SNAPSHOT_KEY, 'session');
};

const buildAuthStateFromPayload = (payload: AuthPayloadDto): AuthState => ({
  user: payload.user,
  addresses: payload.addresses,
  sessions: payload.sessions,
  accessToken: payload.tokens.accessToken,
  loading: false
});

const createInitialAuthState = (): AuthState => {
  const storedPayload = readAuthSnapshot();

  return storedPayload
    ? buildAuthStateFromPayload(storedPayload)
    : {
        user: null,
        addresses: [],
        sessions: [],
        accessToken: null,
        loading: hasSessionMarker()
      };
};

const refreshInitialAuthPayload = async (
  scope: string,
  storedPayload: AuthPayloadDto | null,
  shouldAttemptRefresh: boolean
): Promise<InitialAuthBootstrapResult> => {
  if (!shouldAttemptRefresh) {
    return null;
  }

  const now = Date.now();
  const cachedBootstrap = initialAuthBootstrapByScope.get(scope);
  if (cachedBootstrap && cachedBootstrap.expiresAt > now) {
    return cachedBootstrap.promise;
  }

  const promise = authService
    .refresh()
    .then((payload): InitialAuthBootstrapResult => ({ payload, source: 'refresh' }))
    .catch((): InitialAuthBootstrapResult => (storedPayload ? { payload: storedPayload, source: 'snapshot' } : null));
  initialAuthBootstrapByScope.set(scope, {
    promise,
    expiresAt: now + INITIAL_AUTH_BOOTSTRAP_DEDUPE_MS
  });

  return promise;
};

const storeAuth = (dispatch: Dispatch<AuthAction>, payload: AuthPayloadDto): void => {
  markSessionAvailable();
  writeAuthSnapshot(payload);
  setAccessToken(payload.tokens.accessToken);
  dispatch({ type: 'set', payload });
};

const bootstrapAuthSnapshot = (dispatch: Dispatch<AuthAction>, payload: AuthPayloadDto): void => {
  markSessionAvailable();
  setAccessToken(payload.tokens.accessToken);
  dispatch({ type: 'set', payload });
};

interface AuthProviderProps extends PropsWithChildren {
  bootstrapScope?: string;
}

export const AuthProvider = ({ children, bootstrapScope }: AuthProviderProps): JSX.Element => {
  const [state, dispatch] = useReducer(authReducer, undefined, createInitialAuthState);
  const generatedBootstrapScope = useId();
  const { i18n } = useTranslation();
  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;
  const resolvedBootstrapScope = bootstrapScope ?? generatedBootstrapScope;

  useLayoutEffect(() => {
    if (!state.accessToken) {
      return;
    }

    markSessionAvailable();
    setAccessToken(state.accessToken);
  }, []);

  const syncPayloadLanguage = useCallback(async (payload: AuthPayloadDto): Promise<void> => {
    const activeI18n = i18nRef.current;
    if (payload.user.language !== activeI18n.language) {
      await activeI18n.changeLanguage(payload.user.language);
    }
  }, []);

  const storeAuthWithLanguage = useCallback(
    async (payload: AuthPayloadDto): Promise<void> => {
      await syncPayloadLanguage(payload);
      storeAuth(dispatch, payload);
    },
    [syncPayloadLanguage]
  );

  const bootstrapAuthSnapshotWithLanguage = useCallback(
    (payload: AuthPayloadDto): void => {
      bootstrapAuthSnapshot(dispatch, payload);
      void syncPayloadLanguage(payload);
    },
    [syncPayloadLanguage]
  );

  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const payload = await authService.refresh();
      await storeAuthWithLanguage(payload);
      return payload.tokens.accessToken;
    } catch (error) {
      if (isTransientRefreshFailure(error)) {
        try {
          await waitForRefreshRetry();
          const payload = await authService.refresh();
          await storeAuthWithLanguage(payload);
          return payload.tokens.accessToken;
        } catch (retryError) {
          if (isTransientRefreshFailure(retryError) && state.accessToken) {
            return state.accessToken;
          }
        }
      }
    }

    clearSessionMarker();
    clearAuthSnapshot();
    setAccessToken(null);
    dispatch({ type: 'clear' });
    return null;
  }, [state.accessToken, storeAuthWithLanguage]);

  useEffect(() => {
    registerRefreshHandler(refreshSession);
    return () => registerRefreshHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    let isCancelled = false;
    const storedPayload = readAuthSnapshot();
    const shouldAttemptRefresh = Boolean(storedPayload || hasSessionMarker());

    if (storedPayload) {
      bootstrapAuthSnapshotWithLanguage(storedPayload);
    }

    void (async () => {
      const result = await refreshInitialAuthPayload(resolvedBootstrapScope, storedPayload, shouldAttemptRefresh);
      if (isCancelled) {
        return;
      }

      if (!result) {
        clearSessionMarker();
        clearAuthSnapshot();
        setAccessToken(null);
        dispatch({ type: 'clear' });
        return;
      }

      if (result.source === 'refresh') {
        await storeAuthWithLanguage(result.payload);
        return;
      }

      bootstrapAuthSnapshotWithLanguage(result.payload);
    })();

    return () => {
      isCancelled = true;
    };
  }, [bootstrapAuthSnapshotWithLanguage, resolvedBootstrapScope, storeAuthWithLanguage]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== 'njstore:email-verified-event') {
        return;
      }

      void refreshSession();
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshSession]);

  const login = useCallback<AuthContextValue['login']>(
    async (payload) => {
      dispatch({ type: 'start' });
      const auth = await authService.login(payload);
      await storeAuthWithLanguage(auth);
    },
    [storeAuthWithLanguage]
  );

  const googleLogin = useCallback<AuthContextValue['googleLogin']>(
    async (payload) => {
      dispatch({ type: 'start' });
      const auth = await authService.googleLogin(payload);
      await storeAuthWithLanguage(auth);
    },
    [storeAuthWithLanguage]
  );

  const register = useCallback<AuthContextValue['register']>(
    async (payload) => {
      dispatch({ type: 'start' });
      const auth = await authService.register(payload);
      await storeAuthWithLanguage(auth);
    },
    [storeAuthWithLanguage]
  );

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await authService.logout();
    disableGoogleAutoSelect();
    clearSessionMarker();
    clearAuthSnapshot();
    setAccessToken(null);
    dispatch({ type: 'clear' });
  }, []);

  const logoutAll = useCallback<AuthContextValue['logoutAll']>(async () => {
    await authService.logoutAll();
    disableGoogleAutoSelect();
    clearSessionMarker();
    clearAuthSnapshot();
    setAccessToken(null);
    dispatch({ type: 'clear' });
  }, []);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (payload) => {
      const auth = await authService.updateProfile(payload);
      await storeAuthWithLanguage(auth);
    },
    [storeAuthWithLanguage]
  );

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(async (payload) => {
    await authService.updatePassword(payload);
    clearSessionMarker();
    clearAuthSnapshot();
    setAccessToken(null);
    dispatch({ type: 'clear' });
  }, []);

  const addAddress = useCallback<AuthContextValue['addAddress']>(async (payload) => {
    const auth = await authService.addAddress(payload);
    storeAuth(dispatch, auth);
  }, []);

  const updateAddress = useCallback<AuthContextValue['updateAddress']>(async (addressId, payload) => {
    const auth = await authService.updateAddress(addressId, payload);
    storeAuth(dispatch, auth);
  }, []);

  const deleteAddress = useCallback<AuthContextValue['deleteAddress']>(async (addressId) => {
    const auth = await authService.deleteAddress(addressId);
    storeAuth(dispatch, auth);
  }, []);

  const setDefaultAddress = useCallback<AuthContextValue['setDefaultAddress']>(async (addressId) => {
    const auth = await authService.setDefaultAddress(addressId);
    storeAuth(dispatch, auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      googleLogin,
      register,
      logout,
      logoutAll,
      refreshSession,
      updateProfile,
      updatePassword,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress
    }),
    [
      addAddress,
      deleteAddress,
      googleLogin,
      login,
      logout,
      logoutAll,
      refreshSession,
      register,
      setDefaultAddress,
      state,
      updateAddress,
      updatePassword,
      updateProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
