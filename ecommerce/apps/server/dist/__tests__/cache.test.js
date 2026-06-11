import { describe, expect, it } from 'vitest';
import { buildStableCacheSuffix, cacheNamespaces, cacheService } from '../services/cacheService.js';
describe('cacheService', () => {
    it('builds deterministic cache suffixes regardless of key order', () => {
        const left = buildStableCacheSuffix({ page: 1, filters: { brand: 'Apple', stock: true } });
        const right = buildStableCacheSuffix({ filters: { stock: true, brand: 'Apple' }, page: 1 });
        expect(left).toBe(right);
    });
    it('caches remember values for the same key', async () => {
        let loaderCount = 0;
        const key = `test:remember:${Date.now()}`;
        const first = await cacheService.remember(key, 60, async () => {
            loaderCount += 1;
            return { value: 'cached' };
        });
        const second = await cacheService.remember(key, 60, async () => {
            loaderCount += 1;
            return { value: 'miss' };
        });
        expect(first).toEqual({ value: 'cached' });
        expect(second).toEqual({ value: 'cached' });
        expect(loaderCount).toBe(1);
        await cacheService.delete(key);
    });
    it('shares concurrent remember loads for the same key', async () => {
        let loaderCount = 0;
        const key = `test:singleflight:${Date.now()}`;
        const [first, second] = await Promise.all([
            cacheService.remember(key, 60, async () => {
                loaderCount += 1;
                await new Promise((resolve) => {
                    setTimeout(resolve, 20);
                });
                return { value: 'shared' };
            }),
            cacheService.remember(key, 60, async () => {
                loaderCount += 1;
                return { value: 'duplicate' };
            })
        ]);
        expect(first).toEqual({ value: 'shared' });
        expect(second).toEqual({ value: 'shared' });
        expect(loaderCount).toBe(1);
        await cacheService.delete(key);
    });
    it('changes the versioned key when a namespace is bumped', async () => {
        const suffix = `products:${Date.now()}`;
        const firstKey = await cacheService.versionedKey(cacheNamespaces.products, suffix);
        await cacheService.bumpNamespace(cacheNamespaces.products);
        const secondKey = await cacheService.versionedKey(cacheNamespaces.products, suffix);
        expect(secondKey).not.toBe(firstKey);
    });
});
