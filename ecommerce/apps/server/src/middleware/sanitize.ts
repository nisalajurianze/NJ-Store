import type { NextFunction, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';

const PROHIBITED_KEY_PATTERN = /^\$|\./;
const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_XSS_SANITIZE_DEPTH = 100;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  return Object.prototype.toString.call(value) === '[object Object]';
};

export const sanitizeMongoPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMongoPayload(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitizedObject: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (PROTOTYPE_POLLUTION_KEYS.has(key) || PROHIBITED_KEY_PATTERN.test(key)) {
      return;
    }

    sanitizedObject[key] = sanitizeMongoPayload(nestedValue);
  });

  return sanitizedObject;
};

export const mongoSanitize = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitizeMongoPayload(req.body);
  req.params = sanitizeMongoPayload(req.params) as Request['params'];

  Object.defineProperty(req, 'query', {
    value: sanitizeMongoPayload(req.query) as Request['query'],
    writable: false,
    configurable: true,
    enumerable: true
  });

  next();
};

export const sanitizeXssPayload = (value: unknown, currentDepth = 0): unknown => {
  if (currentDepth > MAX_XSS_SANITIZE_DEPTH) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeHtml(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeXssPayload(item, currentDepth + 1));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitizedObject: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      return;
    }

    sanitizedObject[key] = sanitizeXssPayload(nestedValue, currentDepth + 1);
  });

  return sanitizedObject;
};

export const xssSanitize = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitizeXssPayload(req.body);
  req.params = sanitizeXssPayload(req.params) as Request['params'];
  req.headers = sanitizeXssPayload(req.headers) as Request['headers'];

  Object.defineProperty(req, 'query', {
    value: sanitizeXssPayload(req.query) as Request['query'],
    writable: false,
    configurable: true,
    enumerable: true
  });

  next();
};
