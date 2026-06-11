import type { AdminNotificationCenterDto, AdminNotificationItemDto, AdminPermission } from '@njstore/types';
import { AdminNotificationView } from '../../models/AdminNotificationView.js';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { ProductQuestion } from '../../models/ProductQuestion.js';
import { ReturnRequest } from '../../models/ReturnRequest.js';
import { Review } from '../../models/Review.js';
import { siteConfigService } from '../siteConfigService.js';

type CountAndDate = {
  count: number;
  createdAt?: string;
};

const priorityRank: Record<AdminNotificationItemDto['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2
};

const hasPermission = (permissions: readonly AdminPermission[], permission: AdminPermission): boolean =>
  permissions.includes(permission);

const toIsoDate = (value: Date | string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const sortNotifications = (left: AdminNotificationItemDto, right: AdminNotificationItemDto): number => {
  const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
};

const getNotificationFingerprint = (item: AdminNotificationItemDto): string =>
  [item.id, item.count, item.createdAt ?? 'undated'].join(':');

const getUnreadItems = async (items: AdminNotificationItemDto[], userId?: string): Promise<AdminNotificationItemDto[]> => {
  if (!userId || !items.length) {
    return items;
  }

  const views = await AdminNotificationView.find({
    user: userId,
    notificationId: { $in: items.map((item) => item.id) }
  })
    .select('notificationId fingerprint')
    .lean<Array<{ notificationId: string; fingerprint: string }>>();

  const viewedFingerprints = new Map(views.map((view) => [view.notificationId, view.fingerprint]));
  return items.filter((item) => viewedFingerprints.get(item.id) !== getNotificationFingerprint(item));
};

export const notificationAdminService = {
  getCenter: async (permissions: readonly AdminPermission[], userId?: string): Promise<AdminNotificationCenterDto> => {
    const canReadOrders = hasPermission(permissions, 'order:read');
    const canReadProducts = hasPermission(permissions, 'product:read');

    const [pendingOrders, receiptUploads, pendingReturns, lowStockVariants, pendingQuestions, pendingReviews] =
      await Promise.all([
        canReadOrders
          ? Promise.all([
              Order.countDocuments({ deletedAt: null, isQuotation: false, status: 'pending' }),
              Order.findOne({ deletedAt: null, isQuotation: false, status: 'pending' }).sort({ createdAt: -1 }).select('createdAt').lean<{ createdAt?: Date }>()
            ]).then<CountAndDate>(([count, latest]) => ({ count, createdAt: toIsoDate(latest?.createdAt) }))
          : Promise.resolve<CountAndDate>({ count: 0 }),
        canReadOrders
          ? Promise.all([
              Order.countDocuments({ deletedAt: null, paymentStatus: 'receipt_uploaded' }),
              Order.findOne({ deletedAt: null, paymentStatus: 'receipt_uploaded' }).sort({ updatedAt: -1 }).select('updatedAt').lean<{ updatedAt?: Date }>()
            ]).then<CountAndDate>(([count, latest]) => ({ count, createdAt: toIsoDate(latest?.updatedAt) }))
          : Promise.resolve<CountAndDate>({ count: 0 }),
        canReadOrders
          ? Promise.all([
              ReturnRequest.countDocuments({ status: 'pending' }),
              ReturnRequest.findOne({ status: 'pending' }).sort({ createdAt: -1 }).select('createdAt').lean<{ createdAt?: Date }>()
            ]).then<CountAndDate>(([count, latest]) => ({ count, createdAt: toIsoDate(latest?.createdAt) }))
          : Promise.resolve<CountAndDate>({ count: 0 }),
        canReadProducts
          ? siteConfigService.getOrCreateDocument().then(async (siteConfig) => {
              const [summary] = await Product.aggregate<{ count: number; updatedAt?: Date }>([
                { $match: { isActive: true } },
                { $unwind: '$variants' },
                { $match: { 'variants.stock': { $lt: siteConfig.lowStockThreshold } } },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 },
                    updatedAt: { $max: '$updatedAt' }
                  }
                }
              ]);

              return {
                count: summary?.count ?? 0,
                createdAt: toIsoDate(summary?.updatedAt)
              };
            })
          : Promise.resolve<CountAndDate>({ count: 0 }),
        canReadProducts
          ? Promise.all([
              ProductQuestion.countDocuments({ status: 'pending' }),
              ProductQuestion.findOne({ status: 'pending' }).sort({ createdAt: -1 }).select('createdAt').lean<{ createdAt?: Date }>()
            ]).then<CountAndDate>(([count, latest]) => ({ count, createdAt: toIsoDate(latest?.createdAt) }))
          : Promise.resolve<CountAndDate>({ count: 0 }),
        canReadProducts
          ? Promise.all([
              Review.countDocuments({ isApproved: false }),
              Review.findOne({ isApproved: false }).sort({ createdAt: -1 }).select('createdAt').lean<{ createdAt?: Date }>()
            ]).then<CountAndDate>(([count, latest]) => ({ count, createdAt: toIsoDate(latest?.createdAt) }))
          : Promise.resolve<CountAndDate>({ count: 0 })
      ]);

    const rawItems: Array<AdminNotificationItemDto | null> = [
      pendingOrders.count
        ? {
            id: 'pending-orders',
            kind: 'order',
            priority: 'high',
            title: 'New orders waiting',
            body: `${pendingOrders.count} order${pendingOrders.count === 1 ? '' : 's'} need confirmation or assignment.`,
            count: pendingOrders.count,
            href: '/dashboard/orders?status=pending',
            actionLabel: 'Review orders',
            createdAt: pendingOrders.createdAt
          }
        : null,
      receiptUploads.count
        ? {
            id: 'receipt-uploads',
            kind: 'payment',
            priority: 'high',
            title: 'Receipts to verify',
            body: `${receiptUploads.count} uploaded receipt${receiptUploads.count === 1 ? '' : 's'} are ready for payment review.`,
            count: receiptUploads.count,
            href: '/dashboard/orders?paymentStatus=receipt_uploaded',
            actionLabel: 'Verify receipts',
            createdAt: receiptUploads.createdAt
          }
        : null,
      pendingReturns.count
        ? {
            id: 'pending-returns',
            kind: 'return',
            priority: 'medium',
            title: 'Return requests open',
            body: `${pendingReturns.count} customer return request${pendingReturns.count === 1 ? '' : 's'} need a decision.`,
            count: pendingReturns.count,
            href: '/dashboard/returns?status=pending',
            actionLabel: 'Open returns',
            createdAt: pendingReturns.createdAt
          }
        : null,
      lowStockVariants.count
        ? {
            id: 'low-stock',
            kind: 'inventory',
            priority: 'medium',
            title: 'Low-stock variants',
            body: `${lowStockVariants.count} active variant${lowStockVariants.count === 1 ? '' : 's'} are below the store threshold.`,
            count: lowStockVariants.count,
            href: '/dashboard/products?inventory=low_stock',
            actionLabel: 'Check stock',
            createdAt: lowStockVariants.createdAt
          }
        : null,
      pendingQuestions.count
        ? {
            id: 'pending-questions',
            kind: 'question',
            priority: 'low',
            title: 'Product questions',
            body: `${pendingQuestions.count} shopper question${pendingQuestions.count === 1 ? '' : 's'} are waiting for an answer.`,
            count: pendingQuestions.count,
            href: '/dashboard/product-questions?status=pending',
            actionLabel: 'Answer questions',
            createdAt: pendingQuestions.createdAt
          }
        : null,
      pendingReviews.count
        ? {
            id: 'pending-reviews',
            kind: 'review',
            priority: 'low',
            title: 'Reviews to moderate',
            body: `${pendingReviews.count} review${pendingReviews.count === 1 ? '' : 's'} need approval before publishing.`,
            count: pendingReviews.count,
            href: '/dashboard/reviews',
            actionLabel: 'Moderate reviews',
            createdAt: pendingReviews.createdAt
          }
        : null
    ];

    const items = rawItems.filter((item): item is AdminNotificationItemDto => Boolean(item));
    const sortedItems = await getUnreadItems(items.sort(sortNotifications), userId);

    return {
      items: sortedItems,
      totalCount: sortedItems.reduce((sum, item) => sum + item.count, 0),
      highPriorityCount: sortedItems.filter((item) => item.priority === 'high').reduce((sum, item) => sum + item.count, 0),
      generatedAt: new Date().toISOString()
    };
  },

  markViewed: async (permissions: readonly AdminPermission[], userId: string, notificationId: string): Promise<AdminNotificationCenterDto> => {
    const activeCenter = await notificationAdminService.getCenter(permissions);
    const activeItem = activeCenter.items.find((item) => item.id === notificationId);

    if (activeItem) {
      await AdminNotificationView.updateOne(
        { user: userId, notificationId },
        {
          $set: {
            fingerprint: getNotificationFingerprint(activeItem),
            viewedAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    return notificationAdminService.getCenter(permissions, userId);
  }
};
