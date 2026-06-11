import { AppError } from '../utils/AppError.js';
const getSchema = (schema, source) => {
    const parsed = schema.safeParse(source);
    if (!parsed.success) {
        throw new AppError(parsed.error.issues.map((issue) => issue.message).join(', '), 400);
    }
    return parsed.data;
};
export const validateBody = (schema) => (req, _res, next) => {
    req.body = getSchema(schema, req.body);
    next();
};
export const validateQuery = (schema) => (req, _res, next) => {
    const parsedQuery = getSchema(schema, req.query);
    const queryBag = req.query;
    // Express exposes req.query via a getter-only property in some runtimes, so mutate it in place.
    Object.keys(queryBag).forEach((key) => {
        delete queryBag[key];
    });
    Object.assign(queryBag, parsedQuery);
    next();
};
export const validateParams = (schema) => (req, _res, next) => {
    req.params = getSchema(schema, req.params);
    next();
};
