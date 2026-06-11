export { phoneSchema, postalCodeSchema } from './schemas.js';

export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const buildPaginationRange = (page: number, totalPages: number): number[] => {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export const dedupeByStableKey = <T>(
  items: T[],
  resolveKey: (item: T) => string | null | undefined
): T[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = resolveKey(item)?.trim();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
