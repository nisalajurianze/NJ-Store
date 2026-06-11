export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const buildSafeRegex = (value, flags = 'i') => new RegExp(escapeRegExp(value.trim()), flags);
