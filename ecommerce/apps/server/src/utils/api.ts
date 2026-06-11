import type { Response } from 'express';
import type { PaginationMeta } from '@njstore/types';

/**
 * Sends a consistent API response body.
 */
export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  data?: T,
  message?: string,
  pagination?: PaginationMeta
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    pagination
  });
};
