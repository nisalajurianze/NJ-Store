const TRANSIENT_REFRESH_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const INVALID_SESSION_STATUSES = new Set([400, 401, 403]);
const TRANSIENT_ERROR_CODES = new Set(['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'ERR_NETWORK']);

interface AxiosLikeError {
  code?: string;
  isAxiosError?: boolean;
  request?: unknown;
  response?: {
    status?: number;
  };
}

const asAxiosLikeError = (error: unknown): AxiosLikeError | null =>
  error && typeof error === 'object' ? (error as AxiosLikeError) : null;

export const getRefreshFailureStatus = (error: unknown): number | null => {
  const status = asAxiosLikeError(error)?.response?.status;
  return typeof status === 'number' ? status : null;
};

export const isInvalidSessionRefreshFailure = (error: unknown): boolean => {
  const status = getRefreshFailureStatus(error);
  return status !== null && INVALID_SESSION_STATUSES.has(status);
};

export const isTransientRefreshFailure = (error: unknown): boolean => {
  const axiosError = asAxiosLikeError(error);
  if (!axiosError) {
    return false;
  }

  const status = getRefreshFailureStatus(error);
  if (status !== null) {
    return TRANSIENT_REFRESH_STATUSES.has(status);
  }

  if (!axiosError.isAxiosError) {
    return false;
  }

  return Boolean((axiosError.code && TRANSIENT_ERROR_CODES.has(axiosError.code)) || axiosError.request);
};

export const waitForRefreshRetry = (delayMs = 900): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
