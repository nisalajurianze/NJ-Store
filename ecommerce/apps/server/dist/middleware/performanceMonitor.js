import { logger } from '../utils/logger.js';
/**
 * Rolling window of recent request durations (milliseconds).
 * Capped at MAX_SAMPLES to bound memory usage.
 */
const MAX_SAMPLES = 1000;
const SLOW_REQUEST_THRESHOLD_MS = 1000;
const samples = [];
/**
 * Returns the value at the given percentile (0–100) from a sorted array.
 * The array is sorted in-place.
 */
const percentile = (sorted, p) => {
    if (sorted.length === 0) {
        return 0;
    }
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
};
/**
 * Returns a snapshot of the current P50 / P90 / P99 latency percentiles
 * computed from the rolling sample window.
 */
export const getLatencyPercentiles = () => {
    if (samples.length === 0) {
        return { p50: 0, p90: 0, p99: 0, sampleCount: 0 };
    }
    const sorted = [...samples].sort((a, b) => a - b);
    return {
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p99: percentile(sorted, 99),
        sampleCount: sorted.length
    };
};
/**
 * Express middleware that measures end-to-end request duration and:
 *  - Records the duration in the rolling sample window.
 *  - Emits a `warn` log for any request that exceeds SLOW_REQUEST_THRESHOLD_MS.
 *  - Periodically logs a percentile summary (every 100 requests).
 */
export const performanceMonitor = (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        // Maintain a fixed-size rolling window.
        if (samples.length >= MAX_SAMPLES) {
            samples.shift();
        }
        samples.push(durationMs);
        if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
            logger.warn('perf.slow_request', {
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                durationMs,
                requestId: req.requestId
            });
        }
        // Log a percentile summary every 100 completed requests.
        if (samples.length % 100 === 0) {
            const { p50, p90, p99, sampleCount } = getLatencyPercentiles();
            logger.info('perf.latency_percentiles', {
                p50Ms: p50,
                p90Ms: p90,
                p99Ms: p99,
                sampleCount
            });
        }
    });
    next();
};
