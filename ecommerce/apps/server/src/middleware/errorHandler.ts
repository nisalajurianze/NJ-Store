import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(error.issues.map((issue) => issue.message).join(', '), 400);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(Object.values(error.errors).map((item) => item.message).join(', '), 400);
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${error.path}`, 400);
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    return new AppError('Duplicate field value', 409);
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500);
  }

  return new AppError('Unexpected server error', 500);
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    logger.error(normalized.message, {
      requestId: req.requestId,
      statusCode: normalized.statusCode,
      path: req.originalUrl,
      method: req.method,
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  res.status(normalized.statusCode).json({
    success: false,
    message: env.NODE_ENV === 'production' && normalized.statusCode >= 500
      ? 'Something went wrong'
      : normalized.message,
    requestId: req.requestId
  });
};
