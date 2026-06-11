import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { env } from '../config/env.js';
import { emailService } from './emailService.js';

const ABANDONED_CART_STAGES_HOURS = [24, 48, 72] as const;
const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;

type PopulatedCart = Awaited<ReturnType<typeof fetchCandidateCarts>>[number];

const isPopulatedCartUser = (
  value: unknown
): value is { _id: string | { toString: () => string }; name: string; email: string; isActive: boolean } =>
  Boolean(
    value &&
      typeof value === 'object' &&
      '_id' in value &&
      'name' in value &&
      typeof value.name === 'string' &&
      'email' in value &&
      typeof value.email === 'string' &&
      'isActive' in value &&
      typeof value.isActive === 'boolean'
  );

const fetchCandidateCarts = async () =>
  Cart.find({
    user: { $ne: null },
    'items.0': { $exists: true },
    updatedAt: { $lte: new Date(Date.now() - ABANDONED_CART_STAGES_HOURS[0] * 60 * 60 * 1000) }
  })
    .populate('user', 'name email isActive')
    .populate({
      path: 'items.product',
      populate: [{ path: 'category' }, { path: 'brand' }]
    });

const getCartVersionKey = (updatedAt?: Date | string | null): string => {
  const value = updatedAt ? new Date(updatedAt) : new Date(0);
  return Number.isNaN(value.getTime()) ? 'invalid' : value.toISOString();
};

const resolveCartStageToSend = (cart: {
  updatedAt?: Date | string | null;
  abandonedRecoveryEmails?: Array<{ stageHours: number; cartUpdatedAt: Date }>;
}): (typeof ABANDONED_CART_STAGES_HOURS)[number] | undefined => {
  const updatedAt = cart.updatedAt ? new Date(cart.updatedAt) : null;
  if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
    return undefined;
  }

  const ageHours = (Date.now() - updatedAt.getTime()) / (60 * 60 * 1000);
  const cartVersionKey = getCartVersionKey(updatedAt);
  const sentStages = new Set(
    (cart.abandonedRecoveryEmails ?? [])
      .filter((entry) => getCartVersionKey(entry.cartUpdatedAt) === cartVersionKey)
      .map((entry) => entry.stageHours)
  );

  return ABANDONED_CART_STAGES_HOURS.find((stage) => ageHours >= stage && !sentStages.has(stage));
};

const hasRecentOrder = async (cart: PopulatedCart): Promise<boolean> => {
  if (!cart.user || typeof cart.user !== 'object' || !('_id' in cart.user)) {
    return false;
  }

  return Boolean(
    await Order.exists({
      user: cart.user._id,
      isQuotation: false,
      deletedAt: null,
      createdAt: { $gte: cart.updatedAt }
    })
  );
};

export const abandonedCartService = {
  processAbandonedCarts: async (): Promise<{ checked: number; sent: number }> => {
    const carts = await fetchCandidateCarts();
    let sent = 0;

    for (const cart of carts) {
      const stageHours = resolveCartStageToSend(cart);
      if (!stageHours) {
        continue;
      }

      const user = isPopulatedCartUser(cart.user) ? cart.user : null;

      if (!user?.isActive || !user.email?.trim()) {
        continue;
      }

      if (await hasRecentOrder(cart)) {
        continue;
      }

      const lineItems = cart.items
        .filter(
          (item): item is typeof item & {
            product: {
              name: string;
              slug: string;
              price: number;
              variants: Array<{ price?: number; stock: number }>;
            };
          } => Boolean(item.product && typeof item.product === 'object' && 'name' in item.product && 'slug' in item.product)
        )
        .map((item) => {
          const variant = item.variantIndex !== undefined ? item.product.variants[item.variantIndex] : undefined;
          return {
            name: item.product.name,
            quantity: item.quantity,
            price: variant?.price ?? item.product.price
          };
        });

      if (!lineItems.length) {
        continue;
      }

      await emailService.sendAbandonedCartRecovery({
        name: user.name,
        email: user.email,
        stageHours,
        cartUrl: `${env.CLIENT_URL.replace(/\/$/, '')}/cart`,
        items: lineItems
      });

      cart.abandonedRecoveryEmails.push({
        stageHours,
        cartUpdatedAt: cart.updatedAt,
        sentAt: new Date()
      });
      await cart.save();
      sent += 1;
    }

    return { checked: carts.length, sent };
  },

  getIntervalMs: (): number => SIX_HOURS_IN_MS
};
