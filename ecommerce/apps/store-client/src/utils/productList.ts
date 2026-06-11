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
