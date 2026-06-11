import dayjs from 'dayjs';
import { Types } from 'mongoose';
import type { CustomerMiningDto, ProductCardDto } from '@njstore/types';
import { CustomerBehaviorEvent } from '../models/CustomerBehaviorEvent.js';
import { Product } from '../models/Product.js';
import { cacheNamespaces, cacheService } from './cacheService.js';
import { serializeProductCard } from '../utils/serializers.js';

const CUSTOMER_MINING_WINDOW_DAYS = 30;
const CUSTOMER_MINING_CACHE_TTL_SECONDS = 120;
const WANTED_PRODUCTS_CACHE_TTL_SECONDS = 180;
const CUSTOMER_BEHAVIOR_QUERY_TIMEOUT_MS = 4_000;
const CUSTOMER_BEHAVIOR_BATCH_LIMIT = 20;

type AnalyticsEventPayload = {
  event: string;
  timestamp?: string;
  anonymousId: string;
  funnelStep?: string;
  acquisition?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  properties?: Record<string, unknown>;
};

type SerializedProductCardInput = Parameters<typeof serializeProductCard>[0];

const buildPublicAvailabilityFilter = (now = new Date()): Record<string, unknown> => ({
  isActive: true,
  $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }]
});

const toStringValue = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  const normalized = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : undefined;
};

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  const normalized = toStringValue(value, 80);
  return normalized && Types.ObjectId.isValid(normalized) ? new Types.ObjectId(normalized) : undefined;
};

const toEventDate = (value: string | undefined): Date => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  const now = new Date();

  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime()) {
    return now;
  }

  return parsed;
};

const buildEventDocument = (event: AnalyticsEventPayload, userId?: string) => {
  const properties = event.properties ?? {};
  const product = toObjectId(properties.product_id);

  return {
    event: event.event,
    anonymousId: event.anonymousId,
    user: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
    funnelStep: toStringValue(event.funnelStep, 80),
    source: toStringValue(event.acquisition?.source, 120),
    medium: toStringValue(event.acquisition?.medium, 80),
    campaign: toStringValue(event.acquisition?.campaign, 160),
    path: toStringValue(properties.path, 240),
    search: toStringValue(properties.search, 240),
    pageType: toStringValue(properties.page_type, 80),
    product,
    productName: toStringValue(properties.product_name, 180),
    productSlug: toStringValue(properties.product_slug, 180),
    brand: toStringValue(properties.brand, 120),
    category: toStringValue(properties.category, 120),
    searchQuery: toStringValue(properties.search_query, 200),
    resultCount: toNumberValue(properties.result_count),
    quantity: toNumberValue(properties.quantity),
    value: toNumberValue(properties.total) ?? toNumberValue(properties.unit_price),
    createdAt: toEventDate(event.timestamp)
  };
};

const emptyCustomerMining = (): CustomerMiningDto => ({
  generatedAt: new Date().toISOString(),
  windowDays: CUSTOMER_MINING_WINDOW_DAYS,
  summary: {
    totalEvents: 0,
    totalPageViews: 0,
    totalProductViews: 0,
    uniqueVisitors: 0,
    repeatVisitors: 0,
    returningVisitorRate: 0,
    averagePageViewsPerVisitor: 0,
    siteEngagementScore: 0,
    cartIntentCount: 0,
    wishlistIntentCount: 0,
    searchCount: 0
  },
  topProducts: [],
  topPages: [],
  segments: [
    {
      key: 'newVisitors',
      label: 'New visitors',
      visitorCount: 0,
      share: 0,
      description: 'Visitors with only light browsing activity in the selected window.'
    },
    {
      key: 'repeatVisitors',
      label: 'Repeat visitors',
      visitorCount: 0,
      share: 0,
      description: 'Visitors who came back or opened more than one page.'
    },
    {
      key: 'productExplorers',
      label: 'Product explorers',
      visitorCount: 0,
      share: 0,
      description: 'Visitors who opened at least one product detail page.'
    },
    {
      key: 'buyingIntent',
      label: 'Buying intent',
      visitorCount: 0,
      share: 0,
      description: 'Visitors who added products to cart or wishlist.'
    }
  ]
});

const fetchWantedProductDemand = async (limit: number) =>
  CustomerBehaviorEvent.aggregate<{
    _id: Types.ObjectId;
    viewCount: number;
    cartAdds: number;
    wishlistAdds: number;
    demandScore: number;
  }>([
    {
      $match: {
        createdAt: { $gte: dayjs().subtract(CUSTOMER_MINING_WINDOW_DAYS, 'day').toDate() },
        product: { $exists: true, $ne: null },
        event: { $in: ['view_item', 'add_to_cart', 'add_to_wishlist'] }
      }
    },
    {
      $group: {
        _id: '$product',
        viewCount: { $sum: { $cond: [{ $eq: ['$event', 'view_item'] }, 1, 0] } },
        cartAdds: { $sum: { $cond: [{ $eq: ['$event', 'add_to_cart'] }, 1, 0] } },
        wishlistAdds: { $sum: { $cond: [{ $eq: ['$event', 'add_to_wishlist'] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        demandScore: { $add: ['$viewCount', { $multiply: ['$cartAdds', 4] }, { $multiply: ['$wishlistAdds', 3] }] }
      }
    },
    { $sort: { demandScore: -1, viewCount: -1 } },
    { $limit: Math.max(limit * 3, 12) }
  ]).option({ maxTimeMS: CUSTOMER_BEHAVIOR_QUERY_TIMEOUT_MS });

const fetchProductCardsByDemand = async (limit: number): Promise<ProductCardDto[]> => {
  const demand = await fetchWantedProductDemand(limit);
  const demandIds = demand.map((entry) => entry._id);
  const productMap = new Map<string, SerializedProductCardInput>();

  if (demandIds.length) {
    const products = await Product.find({ _id: { $in: demandIds }, ...buildPublicAvailabilityFilter() })
      .populate('category')
      .populate('brand')
      .maxTimeMS(CUSTOMER_BEHAVIOR_QUERY_TIMEOUT_MS)
      .lean<SerializedProductCardInput[]>({ virtuals: true });

    products.forEach((product) => productMap.set(product._id.toString(), product));
  }

  const wantedProducts = demand
    .map((entry) => productMap.get(entry._id.toString()))
    .filter((product): product is SerializedProductCardInput => Boolean(product))
    .slice(0, limit);

  if (wantedProducts.length < limit) {
    const excludedIds = wantedProducts.map((product) => product._id);
    const fallbackProducts = await Product.find({
      ...buildPublicAvailabilityFilter(),
      ...(excludedIds.length ? { _id: { $nin: excludedIds } } : {})
    })
      .populate('category')
      .populate('brand')
      .sort({ soldCount: -1, isBestSeller: -1, 'ratings.average': -1, createdAt: -1 })
      .limit(limit - wantedProducts.length)
      .maxTimeMS(CUSTOMER_BEHAVIOR_QUERY_TIMEOUT_MS)
      .lean<SerializedProductCardInput[]>({ virtuals: true });

    wantedProducts.push(...fallbackProducts);
  }

  return wantedProducts.map((product) => serializeProductCard(product, { previewImageLimit: 2 }));
};

export const customerBehaviorService = {
  recordEvents: async (events: AnalyticsEventPayload[], userId?: string): Promise<{ accepted: number }> => {
    const documents = events.slice(0, CUSTOMER_BEHAVIOR_BATCH_LIMIT).map((event) => buildEventDocument(event, userId));

    if (!documents.length) {
      return { accepted: 0 };
    }

    await CustomerBehaviorEvent.insertMany(documents, { ordered: false });
    await cacheService.bumpNamespace(cacheNamespaces.customerBehavior);
    return { accepted: documents.length };
  },

  getWantedProductCards: async (limit = 4): Promise<ProductCardDto[]> =>
    cacheService.rememberVersioned(cacheNamespaces.customerBehavior, `wanted-products:${limit}`, WANTED_PRODUCTS_CACHE_TTL_SECONDS, () =>
      fetchProductCardsByDemand(limit)
    ),

  getCustomerMining: async (windowDays = CUSTOMER_MINING_WINDOW_DAYS): Promise<CustomerMiningDto> =>
    cacheService.rememberVersioned(cacheNamespaces.customerBehavior, `mining:${windowDays}`, CUSTOMER_MINING_CACHE_TTL_SECONDS, async () => {
      const startDate = dayjs().subtract(windowDays, 'day').toDate();
      const [visitorGroups, productDemand, pageDemand] = await Promise.all([
        CustomerBehaviorEvent.aggregate<{
          _id: string;
          totalEvents: number;
          pageViews: number;
          productViews: number;
          cartIntent: number;
          wishlistIntent: number;
          searches: number;
        }>([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$anonymousId',
              totalEvents: { $sum: 1 },
              pageViews: { $sum: { $cond: [{ $eq: ['$event', 'page_view'] }, 1, 0] } },
              productViews: { $sum: { $cond: [{ $eq: ['$event', 'view_item'] }, 1, 0] } },
              cartIntent: { $sum: { $cond: [{ $eq: ['$event', 'add_to_cart'] }, 1, 0] } },
              wishlistIntent: { $sum: { $cond: [{ $eq: ['$event', 'add_to_wishlist'] }, 1, 0] } },
              searches: { $sum: { $cond: [{ $eq: ['$event', 'search'] }, 1, 0] } }
            }
          }
        ]).option({ maxTimeMS: CUSTOMER_BEHAVIOR_QUERY_TIMEOUT_MS }),
        fetchWantedProductDemand(8),
        CustomerBehaviorEvent.aggregate<{
          _id: { path: string; pageType: string };
          viewCount: number;
          visitors: string[];
        }>([
          { $match: { createdAt: { $gte: startDate }, event: 'page_view', path: { $exists: true, $ne: '' } } },
          {
            $group: {
              _id: { path: '$path', pageType: { $ifNull: ['$pageType', 'browse'] } },
              viewCount: { $sum: 1 },
              visitors: { $addToSet: '$anonymousId' }
            }
          },
          { $sort: { viewCount: -1 } },
          { $limit: 8 }
        ]).option({ maxTimeMS: CUSTOMER_BEHAVIOR_QUERY_TIMEOUT_MS })
      ]);

      if (!visitorGroups.length) {
        return {
          ...emptyCustomerMining(),
          generatedAt: new Date().toISOString(),
          windowDays
        };
      }

      const totalEvents = visitorGroups.reduce((sum, visitor) => sum + visitor.totalEvents, 0);
      const totalPageViews = visitorGroups.reduce((sum, visitor) => sum + visitor.pageViews, 0);
      const totalProductViews = visitorGroups.reduce((sum, visitor) => sum + visitor.productViews, 0);
      const cartIntentCount = visitorGroups.reduce((sum, visitor) => sum + visitor.cartIntent, 0);
      const wishlistIntentCount = visitorGroups.reduce((sum, visitor) => sum + visitor.wishlistIntent, 0);
      const searchCount = visitorGroups.reduce((sum, visitor) => sum + visitor.searches, 0);
      const uniqueVisitors = visitorGroups.length;
      const repeatVisitors = visitorGroups.filter((visitor) => visitor.pageViews > 1 || visitor.totalEvents > 2).length;
      const productExplorers = visitorGroups.filter((visitor) => visitor.productViews > 0).length;
      const buyingIntentVisitors = visitorGroups.filter((visitor) => visitor.cartIntent > 0 || visitor.wishlistIntent > 0).length;
      const newVisitors = Math.max(0, uniqueVisitors - repeatVisitors);
      const returningVisitorRate = uniqueVisitors > 0 ? repeatVisitors / uniqueVisitors : 0;
      const averagePageViewsPerVisitor = uniqueVisitors > 0 ? totalPageViews / uniqueVisitors : 0;
      const siteEngagementScore = Math.min(
        100,
        Math.round(
          averagePageViewsPerVisitor * 12 +
            (uniqueVisitors > 0 ? productExplorers / uniqueVisitors : 0) * 35 +
            (uniqueVisitors > 0 ? buyingIntentVisitors / uniqueVisitors : 0) * 40 +
            returningVisitorRate * 25
        )
      );
      const productIds = productDemand.map((entry) => entry._id);
      const productDetails = productIds.length
        ? await Product.find({ _id: { $in: productIds } })
            .select('_id name slug brandName category brand')
            .populate('category')
            .populate('brand')
            .maxTimeMS(CUSTOMER_BEHAVIOR_QUERY_TIMEOUT_MS)
            .lean<Array<{ _id: Types.ObjectId; name: string; slug: string; brandName?: string; category?: { name?: string }; brand?: { name?: string } }>>()
        : [];
      const productDetailMap = new Map(productDetails.map((product) => [product._id.toString(), product]));

      return {
        generatedAt: new Date().toISOString(),
        windowDays,
        summary: {
          totalEvents,
          totalPageViews,
          totalProductViews,
          uniqueVisitors,
          repeatVisitors,
          returningVisitorRate,
          averagePageViewsPerVisitor,
          siteEngagementScore,
          cartIntentCount,
          wishlistIntentCount,
          searchCount
        },
        topProducts: productDemand
          .map((entry) => {
            const detail = productDetailMap.get(entry._id.toString());
            const productId = entry._id.toString();
            const intentCount = entry.cartAdds + entry.wishlistAdds;

            return {
              productId,
              name: detail?.name ?? 'Product',
              slug: detail?.slug,
              brand: detail?.brand?.name ?? detail?.brandName,
              category: detail?.category?.name,
              viewCount: entry.viewCount,
              cartAdds: entry.cartAdds,
              wishlistAdds: entry.wishlistAdds,
              demandScore: entry.demandScore,
              intentRate: entry.viewCount > 0 ? intentCount / entry.viewCount : intentCount > 0 ? 1 : 0
            };
          })
          .slice(0, 8),
        topPages: pageDemand.map((entry) => ({
          path: entry._id.path,
          pageType: entry._id.pageType,
          viewCount: entry.viewCount,
          uniqueVisitors: entry.visitors.length,
          share: totalPageViews > 0 ? entry.viewCount / totalPageViews : 0
        })),
        segments: [
          {
            key: 'newVisitors',
            label: 'New visitors',
            visitorCount: newVisitors,
            share: uniqueVisitors > 0 ? newVisitors / uniqueVisitors : 0,
            description: 'Visitors with only light browsing activity in the selected window.'
          },
          {
            key: 'repeatVisitors',
            label: 'Repeat visitors',
            visitorCount: repeatVisitors,
            share: returningVisitorRate,
            description: 'Visitors who came back or opened more than one page.'
          },
          {
            key: 'productExplorers',
            label: 'Product explorers',
            visitorCount: productExplorers,
            share: uniqueVisitors > 0 ? productExplorers / uniqueVisitors : 0,
            description: 'Visitors who opened at least one product detail page.'
          },
          {
            key: 'buyingIntent',
            label: 'Buying intent',
            visitorCount: buyingIntentVisitors,
            share: uniqueVisitors > 0 ? buyingIntentVisitors / uniqueVisitors : 0,
            description: 'Visitors who added products to cart or wishlist.'
          }
        ]
      };
    })
};
