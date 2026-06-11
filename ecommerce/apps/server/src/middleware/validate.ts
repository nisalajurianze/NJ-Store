import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodEffects, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';

const getSchema = (schema: AnyZodObject | ZodEffects<ZodTypeAny>, source: unknown): unknown => {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((issue) => issue.message).join(', '), 400);
  }
  return parsed.data;
};

export const validateBody =
  (schema: AnyZodObject | ZodEffects<ZodTypeAny>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.body = getSchema(schema, req.body);
    next();
  };

export const validateQuery =
  (schema: AnyZodObject | ZodEffects<ZodTypeAny>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsedQuery = getSchema(schema, req.query) as Record<string, unknown>;
    const queryBag = req.query as Record<string, unknown>;

    // Express exposes req.query via a getter-only property in some runtimes, so mutate it in place.
    Object.keys(queryBag).forEach((key) => {
      delete queryBag[key];
    });
    Object.assign(queryBag, parsedQuery);
    next();
  };

export const validateParams =
  (schema: AnyZodObject | ZodEffects<ZodTypeAny>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.params = getSchema(schema, req.params) as Request['params'];
    next();
  };
