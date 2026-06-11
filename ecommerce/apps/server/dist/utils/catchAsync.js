/**
 * Wraps async route handlers and forwards errors to the global error handler.
 */
export const catchAsync = (handler) => (req, res, next) => {
    handler(req, res, next).catch(next);
};
