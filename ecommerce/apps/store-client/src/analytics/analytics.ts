import type { CartDto, OrderDto, ProductCardDto, ProductDetailDto, UserSummary } from '@njstore/types';
import { resolveApiBaseUrl } from '../utils/apiConfig';

const ANALYTICS_PROFILE_KEY = 'njstore:analytics-profile';
const ANALYTICS_EVENT_LOG_KEY = 'njstore:analytics-event-log';
const EVENT_LOG_LIMIT = 100;
const ID_HISTORY_LIMIT = 50;
const ANALYTICS_BATCH_SIZE = 10;
const ANALYTICS_BATCH_INTERVAL_MS = 5_000;

interface AcquisitionMetadata {
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
  referrer?: string;
  landingPath: string;
}

interface CohortMetadata {
  acquisitionDate: string;
  acquisitionWeek: string;
  acquisitionMonth: string;
  signedUpAt?: string;
  firstPurchaseAt?: string;
}

interface CommerceMetadata {
  quotationCount: number;
  confirmedOrderCount: number;
  revenue: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  averageOrderValue: number;
  loyaltyPointsAwarded: number;
  ltv: number;
  lastQuotationAt?: string;
  lastOrderAt?: string;
  quotationIds: string[];
  orderIds: string[];
}

interface AnalyticsProfile {
  anonymousId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  acquisition: AcquisitionMetadata;
  cohort: CohortMetadata;
  customer: {
    userId?: string;
    email?: string;
    name?: string;
    isAuthenticated: boolean;
  };
  commerce: CommerceMetadata;
}

interface AnalyticsEnvelope {
  id: string;
  event: string;
  timestamp: string;
  anonymousId: string;
  userId?: string;
  funnelStep?: string;
  acquisition: AcquisitionMetadata;
  cohort: CohortMetadata;
  commerce: Omit<CommerceMetadata, 'quotationIds' | 'orderIds'>;
  properties: Record<string, unknown>;
}

interface RuntimeIdentity {
  userId?: string;
}

const runtimeIdentity: RuntimeIdentity = {};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `evt_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
};

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const getCurrentTimestamp = (): string => new Date().toISOString();

const getWeekKey = (date: Date): string => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const getMonthKey = (date: Date): string => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const getLocalStorage = (): Pick<Storage, 'getItem' | 'setItem'> | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = window.localStorage;
    if (typeof storage?.getItem === 'function' && typeof storage?.setItem === 'function') {
      return storage;
    }
  } catch {
    return null;
  }

  return null;
};

const readLocalStorageItem = (key: string): string | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorageItem = (key: string, value: string): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    // Analytics should never block the storefront.
  }
};

const deriveAcquisitionMetadata = (): AcquisitionMetadata => {
  if (typeof window === 'undefined') {
    return {
      source: 'direct',
      medium: 'none',
      landingPath: '/'
    };
  }

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || undefined;
  const source = params.get('utm_source')?.trim() || (referrer ? new URL(referrer).hostname : 'direct');
  const medium = params.get('utm_medium')?.trim() || (referrer ? 'referral' : 'none');

  return {
    source,
    medium,
    campaign: params.get('utm_campaign')?.trim() || undefined,
    term: params.get('utm_term')?.trim() || undefined,
    content: params.get('utm_content')?.trim() || undefined,
    referrer,
    landingPath: `${window.location.pathname}${window.location.search}`
  };
};

const createDefaultProfile = (): AnalyticsProfile => {
  const timestamp = getCurrentTimestamp();
  const cohortDate = new Date(timestamp);

  return {
    anonymousId: createId(),
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    acquisition: deriveAcquisitionMetadata(),
    cohort: {
      acquisitionDate: cohortDate.toISOString().slice(0, 10),
      acquisitionWeek: getWeekKey(cohortDate),
      acquisitionMonth: getMonthKey(cohortDate)
    },
    customer: {
      isAuthenticated: false
    },
    commerce: {
      quotationCount: 0,
      confirmedOrderCount: 0,
      revenue: 0,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      averageOrderValue: 0,
      loyaltyPointsAwarded: 0,
      ltv: 0,
      quotationIds: [],
      orderIds: []
    }
  };
};

const sanitizeStoredProfile = (profile: AnalyticsProfile): AnalyticsProfile => ({
  ...profile,
  customer: {
    isAuthenticated: Boolean(profile.customer?.isAuthenticated)
  }
});

const readProfile = (): AnalyticsProfile => {
  const storedProfile = safeJsonParse<AnalyticsProfile>(readLocalStorageItem(ANALYTICS_PROFILE_KEY));
  if (!storedProfile) {
    return createDefaultProfile();
  }

  const storedCustomer = storedProfile.customer as Record<string, unknown> | undefined;
  const sanitizedProfile = sanitizeStoredProfile(storedProfile);
  const shouldRewriteStoredProfile =
    !storedCustomer ||
    typeof storedCustomer.isAuthenticated !== 'boolean' ||
    Object.keys(storedCustomer).some((key) => key !== 'isAuthenticated');

  if (shouldRewriteStoredProfile) {
    writeProfile(sanitizedProfile);
  }

  return sanitizedProfile;
};

const writeProfile = (profile: AnalyticsProfile): void => {
  writeLocalStorageItem(ANALYTICS_PROFILE_KEY, JSON.stringify(profile));
};

const redactEventForLocalStorage = (event: AnalyticsEnvelope): AnalyticsEnvelope => ({
  ...event,
  userId: undefined
});

const readEventLog = (): AnalyticsEnvelope[] => {
  const storedEvents = safeJsonParse<AnalyticsEnvelope[]>(readLocalStorageItem(ANALYTICS_EVENT_LOG_KEY)) ?? [];
  let shouldRewriteStoredEvents = false;
  const sanitizedEvents = storedEvents.map((event) => {
    if (event.userId === undefined) {
      return event;
    }

    shouldRewriteStoredEvents = true;
    return redactEventForLocalStorage(event);
  });

  if (shouldRewriteStoredEvents) {
    writeEventLog(sanitizedEvents);
  }

  return sanitizedEvents;
};

const writeEventLog = (events: AnalyticsEnvelope[]): void => {
  writeLocalStorageItem(ANALYTICS_EVENT_LOG_KEY, JSON.stringify(events.slice(0, EVENT_LOG_LIMIT)));
};

const compactRecord = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ''));

const touchProfile = (mutate?: (profile: AnalyticsProfile) => void): AnalyticsProfile => {
  const profile = readProfile();
  profile.lastSeenAt = getCurrentTimestamp();
  mutate?.(profile);
  writeProfile(profile);
  return profile;
};

const getPublicCommerceMetadata = (commerce: CommerceMetadata): Omit<CommerceMetadata, 'quotationIds' | 'orderIds'> => ({
  quotationCount: commerce.quotationCount,
  confirmedOrderCount: commerce.confirmedOrderCount,
  revenue: commerce.revenue,
  discountTotal: commerce.discountTotal,
  shippingTotal: commerce.shippingTotal,
  taxTotal: commerce.taxTotal,
  averageOrderValue: commerce.averageOrderValue,
  loyaltyPointsAwarded: commerce.loyaltyPointsAwarded,
  ltv: commerce.ltv,
  lastQuotationAt: commerce.lastQuotationAt,
  lastOrderAt: commerce.lastOrderAt
});

const pushToDataLayer = (event: AnalyticsEnvelope): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    event: event.event,
    event_id: event.id,
    event_timestamp: event.timestamp,
    funnel_step: event.funnelStep,
    anonymous_id: event.anonymousId,
    user_id: event.userId,
    njstore: {
      acquisition: event.acquisition,
      cohort: event.cohort,
      commerce: event.commerce,
      properties: event.properties
    }
  };

  const runtimeWindow = window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  };

  runtimeWindow.dataLayer = runtimeWindow.dataLayer ?? [];
  runtimeWindow.dataLayer.push(payload);

  if (typeof runtimeWindow.gtag === 'function') {
    runtimeWindow.gtag('event', event.event, compactRecord({ ...event.properties, funnel_step: event.funnelStep }));
  }

  window.dispatchEvent(new CustomEvent('njstore:analytics', { detail: payload }));
};

const analyticsBatchQueue: AnalyticsEnvelope[] = [];
let analyticsBatchTimer: number | null = null;
let analyticsFlushListenersRegistered = false;

const resolveAnalyticsEndpoint = (): string | undefined => {
  const configuredEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
  if (configuredEndpoint) {
    return configuredEndpoint;
  }

  const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
  return `${apiBaseUrl.replace(/\/+$/, '')}/analytics/events`;
};

const sendAnalyticsBatch = (endpoint: string, events: AnalyticsEnvelope[]): void => {
  if (!events.length || typeof window === 'undefined') {
    return;
  }

  const payload = JSON.stringify({ events });

  if (typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: payload,
    keepalive: true
  }).catch(() => undefined);
};

const flushAnalyticsBatch = (): void => {
  const endpoint = resolveAnalyticsEndpoint();
  if (!endpoint || analyticsBatchQueue.length === 0) {
    return;
  }

  if (analyticsBatchTimer !== null) {
    window.clearTimeout(analyticsBatchTimer);
    analyticsBatchTimer = null;
  }

  const batch = analyticsBatchQueue.splice(0, analyticsBatchQueue.length);
  sendAnalyticsBatch(endpoint, batch);
};

const scheduleAnalyticsFlush = (): void => {
  if (analyticsBatchTimer !== null || typeof window === 'undefined') {
    return;
  }

  analyticsBatchTimer = window.setTimeout(() => {
    analyticsBatchTimer = null;
    flushAnalyticsBatch();
  }, ANALYTICS_BATCH_INTERVAL_MS);
};

const ensureAnalyticsFlushListeners = (): void => {
  if (analyticsFlushListenersRegistered || typeof window === 'undefined') {
    return;
  }

  analyticsFlushListenersRegistered = true;
  window.addEventListener('pagehide', flushAnalyticsBatch);
};

const forwardToEndpoint = (event: AnalyticsEnvelope): void => {
  const endpoint = resolveAnalyticsEndpoint();

  if (!endpoint || typeof window === 'undefined') {
    return;
  }

  ensureAnalyticsFlushListeners();
  analyticsBatchQueue.push(event);

  if (analyticsBatchQueue.length >= ANALYTICS_BATCH_SIZE) {
    flushAnalyticsBatch();
    return;
  }

  scheduleAnalyticsFlush();
};

const appendEventToLog = (event: AnalyticsEnvelope): void => {
  const nextEvents = [redactEventForLocalStorage(event), ...readEventLog()];
  writeEventLog(nextEvents);
};

const mapPathToFunnelStep = (pathname: string): string => {
  if (pathname === '/') {
    return 'landing';
  }

  if (pathname === '/shop') {
    return 'catalog';
  }

  if (pathname.startsWith('/product/')) {
    return 'product_detail';
  }

  if (pathname === '/cart') {
    return 'cart';
  }

  if (pathname === '/checkout') {
    return 'checkout';
  }

  if (pathname.startsWith('/dashboard/orders/')) {
    return 'quotation_review';
  }

  if (pathname === '/auth/register') {
    return 'signup';
  }

  if (pathname === '/auth/login') {
    return 'signin';
  }

  return 'browse';
};

const track = (eventName: string, properties: Record<string, unknown>, funnelStep?: string): AnalyticsEnvelope => {
  const profile = touchProfile();
  const envelope: AnalyticsEnvelope = {
    id: createId(),
    event: eventName,
    timestamp: getCurrentTimestamp(),
    anonymousId: profile.anonymousId,
    userId: runtimeIdentity.userId,
    funnelStep,
    acquisition: profile.acquisition,
    cohort: profile.cohort,
    commerce: getPublicCommerceMetadata(profile.commerce),
    properties: compactRecord(properties)
  };

  appendEventToLog(envelope);
  pushToDataLayer(envelope);
  forwardToEndpoint(envelope);

  return envelope;
};

const getProductLineItem = (product: ProductCardDto | ProductDetailDto, quantity: number, price?: number) =>
  compactRecord({
    product_id: product.id,
    product_name: product.name,
    product_slug: product.slug,
    brand: product.brand,
    category: product.category?.name,
    quantity,
    unit_price: typeof price === 'number' ? price : product.price,
    stock: product.stock
  });

const getOrderItems = (order: Partial<OrderDto>): OrderDto['items'] => (Array.isArray(order.items) ? order.items : []);

const getOrderItemCount = (order: Partial<OrderDto>): number => getOrderItems(order).reduce((sum, item) => sum + (item.quantity ?? 0), 0);

export const analytics = {
  captureAcquisition: (): AnalyticsProfile => touchProfile(),
  identify: (user: UserSummary): AnalyticsProfile => {
    runtimeIdentity.userId = user.id;
    return touchProfile((profile) => {
      profile.customer = {
        isAuthenticated: true
      };
    });
  },
  clearIdentity: (): AnalyticsProfile => {
    delete runtimeIdentity.userId;
    return touchProfile((profile) => {
      profile.customer = {
        isAuthenticated: false
      };
    });
  },
  trackPageView: (pathname: string, search = ''): AnalyticsEnvelope =>
    track(
      'page_view',
      {
        path: pathname,
        search,
        page_type: mapPathToFunnelStep(pathname)
      },
      mapPathToFunnelStep(pathname)
    ),
  trackProductViewed: (product: ProductDetailDto, price: number, _stock: number): AnalyticsEnvelope =>
    track(
      'view_item',
      {
        ...getProductLineItem(product, 1, price),
        sku: product.sku,
        rating_average: product.ratings.average,
        rating_count: product.ratings.count,
        tags: product.tags
      },
      'product_detail'
    ),
  trackAddToCart: ({
    product,
    quantity,
    price,
    origin
  }: {
    product: ProductCardDto | ProductDetailDto;
    quantity: number;
    price?: number;
    origin: string;
  }): AnalyticsEnvelope =>
    track(
      'add_to_cart',
      {
        ...getProductLineItem(product, quantity, price),
        origin
      },
      'cart'
    ),
  trackRemoveFromCart: ({
    product,
    quantity,
    price,
    origin
  }: {
    product: ProductCardDto | ProductDetailDto;
    quantity: number;
    price?: number;
    origin: string;
  }): AnalyticsEnvelope =>
    track(
      'remove_from_cart',
      {
        ...getProductLineItem(product, quantity, price),
        origin
      },
      'cart'
    ),
  trackCartQuantityUpdated: ({
    product,
    previousQuantity,
    nextQuantity,
    unitPrice
  }: {
    product: ProductCardDto | ProductDetailDto;
    previousQuantity: number;
    nextQuantity: number;
    unitPrice: number;
  }): AnalyticsEnvelope =>
    track(
      'update_cart_quantity',
      {
        ...getProductLineItem(product, nextQuantity, unitPrice),
        previous_quantity: previousQuantity,
        next_quantity: nextQuantity
      },
      'cart'
    ),
  trackCartViewed: (cart: CartDto): AnalyticsEnvelope =>
    track(
      'view_cart',
      {
        item_count: cart.itemCount,
        subtotal: cart.subtotal,
        cart_id: cart.id,
        items: cart.items.map((item) => getProductLineItem(item.product, item.quantity, item.lineTotal / Math.max(item.quantity, 1)))
      },
      'cart'
    ),
  trackCheckoutStarted: (cart: CartDto): AnalyticsEnvelope =>
    track(
      'begin_checkout',
      {
        cart_id: cart.id,
        item_count: cart.itemCount,
        subtotal: cart.subtotal
      },
      'checkout'
    ),
  trackQuotationCreated: (order: OrderDto): AnalyticsEnvelope => {
    const profile = touchProfile((currentProfile) => {
      if (order.id && !currentProfile.commerce.quotationIds.includes(order.id)) {
        currentProfile.commerce.quotationIds = [order.id, ...currentProfile.commerce.quotationIds].slice(0, ID_HISTORY_LIMIT);
        currentProfile.commerce.quotationCount += 1;
      }
      currentProfile.commerce.lastQuotationAt = order.createdAt ?? getCurrentTimestamp();
    });

    return track(
      'quotation_created',
      {
        order_id: order.id,
        order_number: order.orderNumber,
        quotation_number: order.quotationNumber,
        item_count: getOrderItemCount(order),
        subtotal: order.subtotal ?? 0,
        shipping_fee: order.shippingFee ?? 0,
        discount: order.discount ?? 0,
        tax_amount: order.taxAmount ?? 0,
        total: order.total ?? 0,
        payment_method: order.paymentMethod,
        fulfilment_type: order.type,
        quotation_count: profile.commerce.quotationCount
      },
      'quotation_review'
    );
  },
  trackPurchaseCompleted: (order: OrderDto): AnalyticsEnvelope => {
    const profile = touchProfile((currentProfile) => {
      if (order.id && currentProfile.commerce.orderIds.includes(order.id)) {
        return;
      }

      if (order.id) {
        currentProfile.commerce.orderIds = [order.id, ...currentProfile.commerce.orderIds].slice(0, ID_HISTORY_LIMIT);
      }
      currentProfile.commerce.confirmedOrderCount += 1;
      currentProfile.commerce.revenue += order.total ?? 0;
      currentProfile.commerce.discountTotal += order.discount ?? 0;
      currentProfile.commerce.shippingTotal += order.shippingFee ?? 0;
      currentProfile.commerce.taxTotal += order.taxAmount ?? 0;
      currentProfile.commerce.loyaltyPointsAwarded += order.loyaltyPointsAwarded ?? 0;
      currentProfile.commerce.averageOrderValue = Number(
        (currentProfile.commerce.revenue / Math.max(currentProfile.commerce.confirmedOrderCount, 1)).toFixed(2)
      );
      currentProfile.commerce.ltv = Number(currentProfile.commerce.revenue.toFixed(2));
      currentProfile.commerce.lastOrderAt = order.updatedAt || order.createdAt || getCurrentTimestamp();

      if (!currentProfile.cohort.firstPurchaseAt) {
        currentProfile.cohort.firstPurchaseAt = order.updatedAt || order.createdAt || getCurrentTimestamp();
      }
    });

    return track(
      'purchase_completed',
      {
        order_id: order.id,
        order_number: order.orderNumber,
        item_count: getOrderItemCount(order),
        subtotal: order.subtotal ?? 0,
        shipping_fee: order.shippingFee ?? 0,
        discount: order.discount ?? 0,
        tax_amount: order.taxAmount ?? 0,
        total: order.total ?? 0,
        payment_method: order.paymentMethod,
        fulfilment_type: order.type,
        confirmed_order_count: profile.commerce.confirmedOrderCount,
        ltv: profile.commerce.ltv,
        average_order_value: profile.commerce.averageOrderValue
      },
      'purchase'
    );
  },
  trackSignIn: (method: 'password' | 'google'): AnalyticsEnvelope =>
    track(
      'sign_in',
      {
        method
      },
      'signin'
    ),
  trackSignUp: (method: 'password' | 'google'): AnalyticsEnvelope => {
    touchProfile((profile) => {
      profile.cohort.signedUpAt = getCurrentTimestamp();
    });

    return track(
      'sign_up',
      {
        method
      },
      'signup'
    );
  },
  trackSearch: (query: string, resultCount: number): AnalyticsEnvelope =>
    track(
      'search',
      {
        search_query: query.slice(0, 200),
        result_count: resultCount
      },
      'catalog'
    ),
  trackWishlistToggle: (product: ProductCardDto | ProductDetailDto, action: 'add' | 'remove'): AnalyticsEnvelope =>
    track(
      action === 'add' ? 'add_to_wishlist' : 'remove_from_wishlist',
      {
        ...getProductLineItem(product, 1),
        action
      }
    ),
  trackFilterApplied: (filters: Record<string, unknown>): AnalyticsEnvelope =>
    track(
      'filter_applied',
      {
        ...compactRecord(filters)
      },
      'catalog'
    ),
  flush: (): void => flushAnalyticsBatch()
};
