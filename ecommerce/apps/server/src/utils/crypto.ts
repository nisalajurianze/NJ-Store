import crypto from 'node:crypto';

export const createRandomToken = (): string => crypto.randomBytes(32).toString('hex');

export const hashValue = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

export const createHmacToken = (value: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(value).digest('hex');
