const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const isPrivateIpv4Host = (hostname: string): boolean => {
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) {
    return true;
  }

  const secondOctet = hostname.match(/^172\.(\d{1,3})\./)?.[1];
  if (!secondOctet) {
    return false;
  }

  const numericSecondOctet = Number(secondOctet);
  return numericSecondOctet >= 16 && numericSecondOctet <= 31;
};

const isAllowedDevelopmentOrigin = (origin: string, nodeEnv: string): boolean => {
  if (nodeEnv === 'production') {
    return false;
  }

  try {
    const { hostname, port } = new URL(origin);
    if (!port) {
      return false;
    }

    const normalizedHost = hostname.toLowerCase();
    return LOOPBACK_HOSTS.has(normalizedHost) || isPrivateIpv4Host(normalizedHost);
  } catch {
    return false;
  }
};

export const isAllowedOrigin = (
  origin: string | undefined,
  allowedOrigins: Set<string>,
  nodeEnv: string
): boolean => {
  if (!origin) {
    return true;
  }

  return allowedOrigins.has(origin) || isAllowedDevelopmentOrigin(origin, nodeEnv);
};
