export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildSafeRegex = (value: string, flags = 'i'): RegExp => new RegExp(escapeRegExp(value.trim()), flags);
