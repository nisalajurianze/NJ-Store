import crypto from 'node:crypto';
export const createRandomToken = () => crypto.randomBytes(32).toString('hex');
export const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const createHmacToken = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('hex');
