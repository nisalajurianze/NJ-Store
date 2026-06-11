/**
 * Sends a consistent API response body.
 */
export const sendResponse = (res, statusCode, data, message, pagination) => {
    res.status(statusCode).json({
        success: true,
        data,
        message,
        pagination
    });
};
