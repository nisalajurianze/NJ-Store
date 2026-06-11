import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { resolveApiBaseUrl } from '../utils/apiConfig';

const DEFAULT_API_TIMEOUT_MS = 30_000;
const MIN_API_TIMEOUT_MS = 5_000;
const AUTH_REFRESH_BYPASS_PATHS = new Set(['/auth/login', '/auth/refresh']);
const UNSAFE_HTTP_METHODS = new Set(['delete', 'patch', 'post', 'put']);

const resolveApiTimeoutMs = (value: string | undefined): number => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < MIN_API_TIMEOUT_MS) {
    return DEFAULT_API_TIMEOUT_MS;
  }

  return parsedValue;
};

const apiTimeoutMs = resolveApiTimeoutMs(import.meta.env.VITE_API_TIMEOUT_MS);

interface CsrfResponse {
  data: {
    token: string;
  };
}

interface ApiClientControls {
  api: AxiosInstance;
  setAccessToken: (token: string | null) => void;
  registerRefreshHandler: (handler: (() => Promise<string | null>) | null) => void;
  clearCsrfToken: () => void;
}

const resolveRequestPath = (requestUrl: string, baseURL: string): string => {
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const resolvedBase = /^https?:\/\//i.test(baseURL) ? baseURL : `${fallbackOrigin}${baseURL.startsWith('/') ? '' : '/'}${baseURL}`;

  try {
    const resolvedUrl = new URL(requestUrl, resolvedBase);
    return resolvedUrl.pathname.replace(/^\/api\/v\d+/, '') || '/';
  } catch {
    return requestUrl.split('?')[0]?.replace(/^\/api\/v\d+/, '') || '/';
  }
};

const shouldBypassRefresh = (requestUrl: string, baseURL: string): boolean =>
  AUTH_REFRESH_BYPASS_PATHS.has(resolveRequestPath(requestUrl, baseURL));

const shouldAttachCsrfToken = (config: InternalAxiosRequestConfig, baseURL: string): boolean => {
  const method = (config.method ?? 'get').toLowerCase();
  return UNSAFE_HTTP_METHODS.has(method) && resolveRequestPath(String(config.url ?? ''), baseURL) !== '/auth/csrf';
};

const buildEndpointUrl = (baseURL: string, path: string): string => `${baseURL.replace(/\/+$/, '')}${path}`;

export const createAdminApiClient = (): ApiClientControls => {
  const baseURL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
  let accessToken: string | null = null;
  let csrfToken: string | null = null;
  let csrfTokenPromise: Promise<string> | null = null;
  let refreshHandler: (() => Promise<string | null>) | null = null;
  let refreshPromise: Promise<string | null> | null = null;

  const api = axios.create({
    baseURL,
    withCredentials: true,
    timeout: apiTimeoutMs,
    timeoutErrorMessage: `The request took longer than ${Math.round(apiTimeoutMs / 1000)} seconds. Please try again.`,
    headers: {
      Accept: 'application/json'
    }
  });

  const fetchCsrfToken = async (): Promise<string> => {
    if (!csrfTokenPromise) {
      csrfTokenPromise = axios
        .get<CsrfResponse>(buildEndpointUrl(baseURL, '/auth/csrf'), {
          withCredentials: true,
          headers: { Accept: 'application/json' }
        })
        .then((response) => response.data.data.token)
        .finally(() => {
          csrfTokenPromise = null;
        });
    }

    csrfToken = await csrfTokenPromise;
    return csrfToken;
  };

  const ensureCsrfToken = async (): Promise<string> => csrfToken ?? fetchCsrfToken();

  api.interceptors.request.use(async (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (shouldAttachCsrfToken(config, baseURL)) {
      config.headers['X-CSRF-Token'] = await ensureCsrfToken();
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = (error.config ?? {}) as InternalAxiosRequestConfig & { _retry?: boolean };
      const requestUrl = String(config.url ?? '');

      if (error.response?.status === 403 && String(error.response.data?.message ?? '').toLowerCase().includes('csrf')) {
        csrfToken = null;
      }

      if (error.response?.status === 401 && !config._retry && refreshHandler && !shouldBypassRefresh(requestUrl, baseURL)) {
        config._retry = true;
        if (!refreshPromise) {
          refreshPromise = refreshHandler().finally(() => {
            refreshPromise = null;
          });
        }
        const token = await refreshPromise;
        if (!token) {
          accessToken = null;
          throw new Error('Session expired. Please sign in again.');
        }
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }

      throw error;
    }
  );

  return {
    api,
    setAccessToken: (token) => {
      accessToken = token;
    },
    registerRefreshHandler: (handler) => {
      refreshHandler = handler;
    },
    clearCsrfToken: () => {
      csrfToken = null;
      csrfTokenPromise = null;
    }
  };
};

const defaultApiClient = createAdminApiClient();

export const setAccessToken = defaultApiClient.setAccessToken;
export const registerRefreshHandler = defaultApiClient.registerRefreshHandler;
export const clearCsrfToken = defaultApiClient.clearCsrfToken;
const api = defaultApiClient.api;

export default api;
