const DEFAULT_API_BASE_PATH = '/api/v1';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const normalizePath = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');

  if (!trimmed) {
    return DEFAULT_API_BASE_PATH;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\/+/, '')}`;
};

const isLoopbackHost = (hostname: string): boolean => LOOPBACK_HOSTS.has(hostname.toLowerCase());

const shouldPreferSameOriginProxy = (target: URL, currentLocationHref?: string): boolean => {
  const effectiveLocationHref = currentLocationHref ?? (typeof window !== 'undefined' ? window.location.href : undefined);
  if (!effectiveLocationHref) {
    return false;
  }

  const currentLocation = new URL(effectiveLocationHref);
  const currentHost = currentLocation.hostname;
  const isCurrentHostLoopback = isLoopbackHost(currentHost);
  const isTargetLoopback = isLoopbackHost(target.hostname);

  if (isTargetLoopback && !isCurrentHostLoopback) {
    return true;
  }

  if (currentLocation.protocol === 'https:' && target.protocol === 'http:') {
    return true;
  }

  return false;
};

export const resolveApiBaseUrl = (value: string | undefined, currentLocationHref?: string): string => {
  if (!value?.trim()) {
    return DEFAULT_API_BASE_PATH;
  }

  const normalizedValue = normalizePath(value);
  if (!/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue;
  }

  const target = new URL(normalizedValue);
  if (shouldPreferSameOriginProxy(target, currentLocationHref)) {
    return normalizePath(target.pathname);
  }

  return target.toString().replace(/\/+$/, '');
};

export const resolveSocketOrigin = (value: string | undefined, currentLocationHref?: string): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  const normalizedValue = normalizePath(value);
  if (!/^https?:\/\//i.test(normalizedValue)) {
    return undefined;
  }

  const target = new URL(normalizedValue);
  if (shouldPreferSameOriginProxy(target, currentLocationHref)) {
    return undefined;
  }

  return target.origin;
};
