export { phoneSchema, postalCodeSchema } from './schemas.js';
export const slugify = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
export const buildPaginationRange = (page, totalPages) => {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};
export const dedupeByStableKey = (items, resolveKey) => {
    const seen = new Set();
    return items.filter((item) => {
        const key = resolveKey(item)?.trim();
        if (!key || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
export const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
