import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
const TOKEN_BYTES = 32;
const CSRF_SEPARATOR = '.';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const signTokenSeed = (seed) => crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(seed).digest('base64url');
export const createCsrfToken = () => {
    const seed = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
    return `${seed}${CSRF_SEPARATOR}${signTokenSeed(seed)}`;
};
const isValidCsrfToken = (token) => {
    if (!token) {
        return false;
    }
    const [seed, signature] = token.split(CSRF_SEPARATOR);
    if (!seed || !signature) {
        return false;
    }
    const expected = signTokenSeed(seed);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};
export const requireAuthCsrfToken = (req, _res, next) => {
    if (SAFE_METHODS.has(req.method) || req.path === '/api/v1/auth/csrf' || !req.path.startsWith('/api/v1/auth')) {
        next();
        return;
    }
    if (!req.get('origin')) {
        next();
        return;
    }
    if (!isValidCsrfToken(req.get('x-csrf-token'))) {
        next(new AppError('Invalid CSRF token', 403));
        return;
    }
    next();
};
