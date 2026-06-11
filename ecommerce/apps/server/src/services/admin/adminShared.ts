import { Types } from 'mongoose';
import type { AdminPermission } from '@njstore/types';
import { RefreshSession } from '../../models/RefreshSession.js';
import { Review } from '../../models/Review.js';
import { Product } from '../../models/Product.js';
import { cacheKeys, cacheNamespaces, cacheService } from '../cacheService.js';

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const normalizeEmailAddress = (value: string): string => value.trim().toLowerCase();
export const normalizeComparableText = (value?: string | null): string => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
export const SELF_MANAGED_ADMIN_PERMISSIONS: AdminPermission[] = ['user:read', 'user:write'];

export const invalidateCategoryCaches = async (): Promise<void> => {
  await Promise.all([
    cacheService.bumpNamespace(cacheNamespaces.categories),
    cacheService.bumpNamespace(cacheNamespaces.products)
  ]);
};

export const invalidateAnalyticsCaches = async (): Promise<void> => {
  await cacheService.bumpNamespace(cacheNamespaces.analytics);
};

export const invalidateSalesAnalysisCaches = async (): Promise<void> => {
  await Promise.all([
    cacheService.bumpNamespace(cacheNamespaces.analytics),
    cacheService.bumpNamespace(cacheNamespaces.siteConfig)
  ]);
};

export const invalidateCachedUser = async (userId: string, options?: { includeSessions?: boolean }): Promise<void> => {
  const sessionIds = options?.includeSessions
    ? await RefreshSession.find({ user: userId }).select('sessionId').lean<Array<{ sessionId: string }>>()
    : [];

  await Promise.all([
    cacheService.delete(cacheKeys.authUser(userId)),
    sessionIds.length
      ? cacheService.deleteMany(sessionIds.map((session) => cacheKeys.authSession(session.sessionId)))
      : Promise.resolve()
  ]);
};

export const syncReviewRatingsForProducts = async (productIds: readonly Types.ObjectId[]): Promise<void> => {
  const uniqueProductIds = [...new Set(productIds.map((productId) => productId.toString()))].map((productId) => new Types.ObjectId(productId));

  await Promise.all(
    uniqueProductIds.map(async (productId) => {
      const stats = await Review.aggregate<{ average: number; count: number }>([
        { $match: { product: productId, isApproved: true } },
        {
          $group: {
            _id: '$product',
            average: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        }
      ]);

      const rating = stats[0] ?? { average: 0, count: 0 };
      await Product.findByIdAndUpdate(productId, {
        ratings: {
          average: Number(rating.average.toFixed(1)),
          count: rating.count
        }
      });
    })
  );
};

export const mergeUniqueObjectIds = <T extends { toString: () => string }>(left: readonly T[] = [], right: readonly T[] = []): T[] => {
  const mergedItems: T[] = [];
  const seenIds = new Set<string>();

  for (const item of [...left, ...right]) {
    const itemId = item.toString();
    if (seenIds.has(itemId)) {
      continue;
    }

    seenIds.add(itemId);
    mergedItems.push(item);
  }

  return mergedItems;
};

export const mergeUniqueText = (left?: string | null, right?: string | null): string | undefined => {
  const values = [left, right].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return values.length ? [...new Set(values)].join(' / ') : undefined;
};

export const dedupeEmails = (emails: string[]): string[] => [...new Set(emails.map(normalizeEmailAddress).filter(Boolean))];
