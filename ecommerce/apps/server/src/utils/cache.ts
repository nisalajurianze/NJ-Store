import type { Response } from 'express';

const setCacheControl = (res: Response, value: string): void => {
  res.setHeader('Cache-Control', value);
};

export const setNoStoreCache = (res: Response): void => {
  setCacheControl(res, 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

export const setPublicApiCache = (
  res: Response,
  options: {
    maxAge: number;
    sharedMaxAge?: number;
    staleWhileRevalidate?: number;
  }
): void => {
  const directives = [`public`, `max-age=${options.maxAge}`];

  if (options.sharedMaxAge !== undefined) {
    directives.push(`s-maxage=${options.sharedMaxAge}`);
  }

  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  setCacheControl(res, directives.join(', '));
};
