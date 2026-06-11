import type { Request, Response, NextFunction } from 'express';

export const extractApiVersion = (req: Request, res: Response, next: NextFunction) => {
  const match = req.originalUrl.match(/^\/api\/v(\d+)\//);
  if (match) {
    req.apiVersion = parseInt(match[1], 10);
  } else {
    req.apiVersion = 1; // Default to v1 if not explicitly found in path
  }
  next();
};
