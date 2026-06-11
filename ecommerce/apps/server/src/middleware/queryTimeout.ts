import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const QUERY_TIMEOUT_MS = 5_000;
const SLOW_QUERY_THRESHOLD_MS = 2_000;

// MongoDB error code for MaxTimeMSExpired
const MONGO_TIMEOUT_ERROR_CODE = 50;

/**
 * Patches a Mongoose Query or Aggregate to enforce a maxTimeMS budget and
 * log any execution that exceeds the slow-query threshold.
 */
const patchQueryWithTimeout = <T extends { maxTimeMS: (ms: number) => T }>(
  query: T,
  label: string
): T => {
  const start = Date.now();
  const patched = query.maxTimeMS(QUERY_TIMEOUT_MS);

  // Wrap the then-able so we can observe elapsed time after execution.
  const originalThen = (patched as unknown as PromiseLike<unknown>).then?.bind(patched);
  if (typeof originalThen === 'function') {
    (patched as unknown as Record<string, unknown>).then = (
      resolve: ((value: unknown) => unknown) | null | undefined,
      reject: ((reason: unknown) => unknown) | null | undefined
    ) =>
      originalThen(
        (result: unknown) => {
          const elapsed = Date.now() - start;
          if (elapsed >= SLOW_QUERY_THRESHOLD_MS) {
            logger.warn('slow_query.detected', { label, elapsedMs: elapsed, thresholdMs: SLOW_QUERY_THRESHOLD_MS });
          }
          return resolve ? resolve(result) : result;
        },
        (error: unknown) => {
          const elapsed = Date.now() - start;
          const isTimeout =
            (typeof error === 'object' &&
              error !== null &&
              'code' in error &&
              (error as { code: unknown }).code === MONGO_TIMEOUT_ERROR_CODE) ||
            (error instanceof Error && error.message.includes('operation exceeded time limit'));

          if (isTimeout) {
            logger.warn('slow_query.timeout', { label, elapsedMs: elapsed, timeoutMs: QUERY_TIMEOUT_MS });
          }

          return reject ? reject(error) : Promise.reject(error);
        }
      );
  }

  return patched;
};

/**
 * Mongoose plugin that automatically applies maxTimeMS to every find/aggregate
 * query executed while this plugin is active.
 */
export const applyQueryTimeoutPlugin = (schema: mongoose.Schema): void => {
  schema.pre(/^find/, function (this: mongoose.Query<unknown, unknown>) {
    this.maxTimeMS(QUERY_TIMEOUT_MS);
  });

  schema.pre('aggregate', function (this: mongoose.Aggregate<unknown>) {
    this.options = { ...this.options, maxTimeMS: QUERY_TIMEOUT_MS };
  });
};

/**
 * Express error-handling middleware that converts MongoDB MaxTimeMSExpired
 * errors into a clean 503 response so the client gets a deterministic signal
 * instead of a hanging connection.
 */
export const queryTimeoutErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isMongoTimeout =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === MONGO_TIMEOUT_ERROR_CODE;

  const isTimeoutMessage =
    error instanceof Error &&
    (error.message.includes('operation exceeded time limit') ||
      error.message.includes('exceeded time limit') ||
      error.message.includes('MaxTimeMSExpired'));

  if (isMongoTimeout || isTimeoutMessage) {
    logger.warn('query_timeout.http_503', {
      message: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      success: false,
      message: 'The server is temporarily unable to process this request. Please try again shortly.'
    });
    return;
  }

  next(error);
};

export { patchQueryWithTimeout };
