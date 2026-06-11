import { logger } from '../utils/logger.js';
const QUERY_TIMEOUT_MS = 5_000;
const SLOW_QUERY_THRESHOLD_MS = 2_000;
// MongoDB error code for MaxTimeMSExpired
const MONGO_TIMEOUT_ERROR_CODE = 50;
/**
 * Patches a Mongoose Query or Aggregate to enforce a maxTimeMS budget and
 * log any execution that exceeds the slow-query threshold.
 */
const patchQueryWithTimeout = (query, label) => {
    const start = Date.now();
    const patched = query.maxTimeMS(QUERY_TIMEOUT_MS);
    // Wrap the then-able so we can observe elapsed time after execution.
    const originalThen = patched.then?.bind(patched);
    if (typeof originalThen === 'function') {
        patched.then = (resolve, reject) => originalThen((result) => {
            const elapsed = Date.now() - start;
            if (elapsed >= SLOW_QUERY_THRESHOLD_MS) {
                logger.warn('slow_query.detected', { label, elapsedMs: elapsed, thresholdMs: SLOW_QUERY_THRESHOLD_MS });
            }
            return resolve ? resolve(result) : result;
        }, (error) => {
            const elapsed = Date.now() - start;
            const isTimeout = (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === MONGO_TIMEOUT_ERROR_CODE) ||
                (error instanceof Error && error.message.includes('operation exceeded time limit'));
            if (isTimeout) {
                logger.warn('slow_query.timeout', { label, elapsedMs: elapsed, timeoutMs: QUERY_TIMEOUT_MS });
            }
            return reject ? reject(error) : Promise.reject(error);
        });
    }
    return patched;
};
/**
 * Mongoose plugin that automatically applies maxTimeMS to every find/aggregate
 * query executed while this plugin is active.
 */
export const applyQueryTimeoutPlugin = (schema) => {
    schema.pre(/^find/, function () {
        this.maxTimeMS(QUERY_TIMEOUT_MS);
    });
    schema.pre('aggregate', function () {
        this.options = { ...this.options, maxTimeMS: QUERY_TIMEOUT_MS };
    });
};
/**
 * Express error-handling middleware that converts MongoDB MaxTimeMSExpired
 * errors into a clean 503 response so the client gets a deterministic signal
 * instead of a hanging connection.
 */
export const queryTimeoutErrorHandler = (error, _req, res, next) => {
    const isMongoTimeout = typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === MONGO_TIMEOUT_ERROR_CODE;
    const isTimeoutMessage = error instanceof Error &&
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
