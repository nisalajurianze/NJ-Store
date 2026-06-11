import axios from 'axios';

interface ApiErrorPayload {
  message?: unknown;
}

/**
 * Extracts the most useful user-facing message from API and network failures.
 */
export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = (data as ApiErrorPayload).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (error.response?.status === 429) {
      return 'Too many attempts right now. Please wait a moment and try again.';
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Unable to reach the server. Please check your connection and try again.';
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) {
      return 'The server took too long to respond. Please try again.';
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
