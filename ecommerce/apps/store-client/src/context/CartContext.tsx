import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type PropsWithChildren } from 'react';
import type {
  CartDto,
  CartProductSnapshotDto,
  ProductBundleItemDto,
  ProductCardDto,
  ProductSpecificationDto,
  ProductVariantDto
} from '@njstore/types';
import { cartService } from '../services/cartService';
import { readStorageItem, removeStorageItem, writeStorageItem } from '../utils/browserStorage';
import { useAuth } from './AuthContext';

const GUEST_CART_STORAGE_KEY = 'njstore-guest-cart';
const GUEST_CART_STORAGE_VERSION = 2;
const MAX_CART_ITEM_QUANTITY = 20;
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

interface GuestCartItem {
  product: CartProductSnapshotDto;
  quantity: number;
  variantIndex?: number;
}

interface GuestCartStorageV2 {
  version: typeof GUEST_CART_STORAGE_VERSION;
  items: GuestCartItem[];
}

interface GuestCartSyncPayload {
  syncItems: Array<{ productId: string; quantity: number; variantIndex?: number }>;
  unsyncedItems: GuestCartItem[];
}

interface CartState {
  cart: CartDto | null;
  loading: boolean;
}

export interface RecentlyAddedCartItem {
  product: CartProductSnapshotDto;
  quantity: number;
  variantIndex?: number;
}

type CartAction =
  | { type: 'start' }
  | { type: 'set'; payload: CartDto | null };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true };
    case 'set':
      return { cart: action.payload, loading: false };
    default:
      return state;
  }
};

interface CartContextValue extends CartState {
  recentlyAddedItem: RecentlyAddedCartItem | null;
  dismissRecentlyAddedItem: () => void;
  loadCart: () => Promise<void>;
  addItem: (payload: { productId: string; quantity: number; variantIndex?: number; product?: ProductCardDto | CartProductSnapshotDto }) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const normalizeCartQuantity = (value: unknown): number =>
  Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, Math.trunc(toNumber(value) ?? 1)));

const toStringValue = (value: unknown): string | undefined => (typeof value === 'string' ? value.trim() : undefined);

const getApiStatusCode = (error: unknown): number | undefined => {
  if (!isRecord(error) || !isRecord(error.response)) {
    return undefined;
  }

  return toNumber(error.response.status);
};

const isNonRetryableSyncError = (error: unknown): boolean => {
  const statusCode = getApiStatusCode(error);
  return statusCode !== undefined && statusCode >= 400 && statusCode < 500;
};

const normalizeImageAsset = (value: unknown): NonNullable<CartProductSnapshotDto['images']>[number] | null => {
  if (!isRecord(value)) {
    return null;
  }

  const url = toStringValue(value.url);
  if (!url) {
    return null;
  }

  return {
    url,
    publicId: toStringValue(value.publicId) ?? '',
    alt: toStringValue(value.alt)
  };
};

const normalizeCategory = (value: unknown): ProductCardDto['category'] => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = toStringValue(value.id);
  const name = toStringValue(value.name);
  const slug = toStringValue(value.slug) ?? id;

  if (!id || !name || !slug) {
    return undefined;
  }

  return {
    id,
    name,
    slug,
    description: toStringValue(value.description),
    image: normalizeImageAsset(value.image) ?? undefined,
    parent: value.parent === null ? null : toStringValue(value.parent),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    order: Math.max(0, Math.trunc(toNumber(value.order) ?? 0)),
    productCount: toNumber(value.productCount)
  };
};

const normalizeVariant = (value: unknown, productId: string, index: number): ProductVariantDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    color: toStringValue(value.color),
    colorCode: toStringValue(value.colorCode),
    storage: toStringValue(value.storage),
    model: toStringValue(value.model),
    attributes: Array.isArray(value.attributes)
      ? value.attributes
          .map((attribute) => {
            if (!isRecord(attribute)) {
              return null;
            }
            const name = toStringValue(attribute.name);
            const attributeValue = toStringValue(attribute.value);
            return name && attributeValue ? { name, value: attributeValue } : null;
          })
          .filter((attribute): attribute is { name: string; value: string } => Boolean(attribute))
      : undefined,
    glowColor: toStringValue(value.glowColor),
    images: Array.isArray(value.images)
      ? value.images.map((image) => normalizeImageAsset(image)).filter((image): image is NonNullable<typeof image> => Boolean(image))
      : undefined,
    price: toNumber(value.price),
    stock: Math.max(0, Math.trunc(toNumber(value.stock) ?? 0)),
    sku: toStringValue(value.sku) ?? `${productId}-variant-${index + 1}`
  };
};

const normalizeSpecification = (value: unknown): ProductSpecificationDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  const key = toStringValue(value.key);
  const specificationValue = toStringValue(value.value);
  if (!key || !specificationValue) {
    return null;
  }

  return {
    key,
    value: specificationValue
  };
};

const normalizeBundleItem = (value: unknown): ProductBundleItemDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  const product = toStringValue(value.product);
  const name = toStringValue(value.name);
  const slug = toStringValue(value.slug);
  const sku = toStringValue(value.sku);
  const quantity = Math.max(1, Math.trunc(toNumber(value.quantity) ?? 1));

  if (!product || !name || !slug || !sku) {
    return null;
  }

  return {
    product,
    name,
    slug,
    image: normalizeImageAsset(value.image) ?? undefined,
    sku,
    quantity,
    variantIndex: toNumber(value.variantIndex),
    variantLabel: toStringValue(value.variantLabel)
  };
};

const getSnapshotVariants = (product: Pick<CartProductSnapshotDto, 'variants'>): ProductVariantDto[] =>
  Array.isArray(product.variants) ? product.variants : [];

const resolveStoredSnapshotVariantIndex = (
  product: Pick<CartProductSnapshotDto, 'productType' | 'variants'>,
  variantIndex: number | undefined
): number | undefined | null => {
  const variants = getSnapshotVariants(product);
  if (product.productType === 'bundle' || variants.length === 0) {
    return undefined;
  }

  if (variantIndex !== undefined && Number.isInteger(variantIndex) && variantIndex >= 0 && variantIndex < variants.length) {
    return variantIndex;
  }

  if (variants.length === 1) {
    return 0;
  }

  return null;
};

const resolveRequestedSnapshotVariantIndex = (
  product: Pick<CartProductSnapshotDto, 'productType' | 'variants'>,
  variantIndex: number | undefined
): number | undefined => {
  const resolvedVariantIndex = resolveStoredSnapshotVariantIndex(product, variantIndex);
  if (resolvedVariantIndex === null) {
    throw new Error('Select all required options first.');
  }

  return resolvedVariantIndex;
};

const normalizeProductSnapshot = (value: unknown, quantity: number): CartProductSnapshotDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toStringValue(value.id);
  const name = toStringValue(value.name);
  if (!id || !name) {
    return null;
  }

  const previewImages = Array.isArray(value.previewImages)
    ? value.previewImages.map((image) => normalizeImageAsset(image)).filter((image): image is NonNullable<typeof image> => Boolean(image))
    : [];
  const images = Array.isArray(value.images)
    ? value.images.map((image) => normalizeImageAsset(image)).filter((image): image is NonNullable<typeof image> => Boolean(image))
    : previewImages;
  const variants = Array.isArray(value.variants)
    ? value.variants
        .map((variant, index) => normalizeVariant(variant, id, index))
        .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant))
    : [];
  const specifications = Array.isArray(value.specifications)
    ? value.specifications
        .map((specification) => normalizeSpecification(specification))
        .filter((specification): specification is NonNullable<typeof specification> => Boolean(specification))
    : [];
  const tags = Array.isArray(value.tags) ? value.tags.map((tag) => toStringValue(tag)).filter((tag): tag is string => Boolean(tag)) : [];
  const bundleItems = Array.isArray(value.bundleItems)
    ? value.bundleItems
        .map((item) => normalizeBundleItem(item))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];
  const colorVariants = Array.isArray(value.colorVariants)
    ? value.colorVariants
        .map((variant) => {
          if (!isRecord(variant)) {
            return null;
          }

          const variantName = toStringValue(variant.name);
          if (!variantName) {
            return null;
          }

          return {
            name: variantName,
            colorCode: toStringValue(variant.colorCode)
          };
        })
        .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant))
    : undefined;

  const baseSnapshot: ProductCardDto = {
    id,
    name,
    slug: toStringValue(value.slug) ?? id,
    shortDescription: toStringValue(value.shortDescription) ?? toStringValue(value.description) ?? '',
    price: Math.max(0, toNumber(value.price) ?? 0),
    comparePrice: toNumber(value.comparePrice),
    thumbnail: normalizeImageAsset(value.thumbnail) ?? previewImages[0],
    previewImages: previewImages.length ? previewImages : undefined,
    category: normalizeCategory(value.category),
    brand: toStringValue(value.brand) ?? 'NJ Store',
    brandId: toStringValue(value.brandId) ?? null,
    brandSlug: toStringValue(value.brandSlug) ?? null,
    brandLogoUrl: toStringValue(value.brandLogoUrl),
    condition: value.condition === 'new' || value.condition === 'used' ? value.condition : undefined,
    ratings: {
      average: Math.max(0, toNumber(isRecord(value.ratings) ? value.ratings.average : undefined) ?? 0),
      count: Math.max(0, Math.trunc(toNumber(isRecord(value.ratings) ? value.ratings.count : undefined) ?? 0))
    },
    isBestSeller: typeof value.isBestSeller === 'boolean' ? value.isBestSeller : false,
    isFeatured: typeof value.isFeatured === 'boolean' ? value.isFeatured : false,
    isFlashDeal: typeof value.isFlashDeal === 'boolean' ? value.isFlashDeal : undefined,
    flashDealEndsAt: toStringValue(value.flashDealEndsAt),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    publishAt: toStringValue(value.publishAt),
    stock: Math.max(0, Math.trunc(toNumber(value.stock) ?? quantity)),
    discountPercentage: Math.max(0, toNumber(value.discountPercentage) ?? 0),
    productType: value.productType === 'bundle' ? 'bundle' : 'standard',
    colorVariants
  };

  return {
    ...baseSnapshot,
    description: toStringValue(value.description),
    images: images.length ? images : undefined,
    variants: variants.length ? variants : undefined,
    specifications: specifications.length ? specifications : undefined,
    tags: tags.length ? tags : undefined,
    loyaltyPoints: toNumber(value.loyaltyPoints) !== undefined ? Math.max(0, Math.trunc(toNumber(value.loyaltyPoints) ?? 0)) : undefined,
    sku: toStringValue(value.sku) ?? `${id}-guest`,
    weight: toNumber(value.weight),
    metaTitle: toStringValue(value.metaTitle),
    metaDescription: toStringValue(value.metaDescription),
    canonicalUrl: toStringValue(value.canonicalUrl),
    warranty: toStringValue(value.warranty),
    videoUrl: toStringValue(value.videoUrl),
    bundleItems: bundleItems.length ? bundleItems : undefined
  };
};

const normalizeGuestCartItems = (value: unknown): GuestCartItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<GuestCartItem[]>((items, entry) => {
    if (!isRecord(entry)) {
      return items;
    }

    const quantity = normalizeCartQuantity(entry.quantity);
    const product = normalizeProductSnapshot(entry.product, quantity);
    if (!product) {
      return items;
    }

    const rawVariantIndex = toNumber(entry.variantIndex);
    const variantIndex = resolveStoredSnapshotVariantIndex(product, rawVariantIndex);
    if (variantIndex === null) {
      return items;
    }

    items.push({
      product,
      quantity,
      variantIndex
    });

    return items;
  }, []);
};

const isGuestCartStorageV2 = (value: unknown): value is GuestCartStorageV2 =>
  isRecord(value) && value.version === GUEST_CART_STORAGE_VERSION && Array.isArray(value.items);

let guestCartCache: { serialized: string | null; items: GuestCartItem[] } = {
  serialized: null,
  items: []
};

const cloneGuestCartItems = (items: GuestCartItem[]): GuestCartItem[] =>
  items.map((item) => ({
    ...item,
    product: item.product
  }));

const normalizeCanonicalGuestCartItems = (value: unknown): GuestCartItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<GuestCartItem[]>((items, entry) => {
    if (!isRecord(entry) || !isRecord(entry.product)) {
      return items;
    }

    const product = entry.product as unknown as CartProductSnapshotDto;
    if (!toStringValue(product.id) || !toStringValue(product.name)) {
      return items;
    }

    const quantity = normalizeCartQuantity(entry.quantity);
    const rawVariantIndex = toNumber(entry.variantIndex);
    const variantIndex = resolveStoredSnapshotVariantIndex(product, rawVariantIndex);
    if (variantIndex === null) {
      return items;
    }

    items.push({
      product,
      quantity,
      variantIndex
    });

    return items;
  }, []);
};

const readGuestCart = (): GuestCartItem[] => {
  try {
    const stored = readStorageItem(GUEST_CART_STORAGE_KEY);
    if (!stored) {
      guestCartCache = { serialized: null, items: [] };
      return [];
    }

    if (guestCartCache.serialized === stored) {
      return cloneGuestCartItems(guestCartCache.items);
    }

    const parsed = JSON.parse(stored);
    if (isGuestCartStorageV2(parsed)) {
      const items = normalizeCanonicalGuestCartItems(parsed.items);
      if (!items.length && parsed.items.length) {
        clearGuestCart();
        return [];
      }

      const normalizedPayload: GuestCartStorageV2 = {
        version: GUEST_CART_STORAGE_VERSION,
        items
      };
      const normalizedSerialized = JSON.stringify(normalizedPayload);
      guestCartCache = {
        serialized: normalizedSerialized,
        items: cloneGuestCartItems(items)
      };

      if (normalizedSerialized !== stored) {
        writeStorageItem(GUEST_CART_STORAGE_KEY, normalizedSerialized);
      }

      return cloneGuestCartItems(items);
    }

    const items = normalizeGuestCartItems(parsed);
    if (items.length) {
      writeGuestCart(items);
    } else {
      clearGuestCart();
    }

    return items;
  } catch {
    clearGuestCart();
    return [];
  }
};

const writeGuestCart = (items: GuestCartItem[]): void => {
  const payload: GuestCartStorageV2 = {
    version: GUEST_CART_STORAGE_VERSION,
    items
  };
  const serialized = JSON.stringify(payload);
  guestCartCache = {
    serialized,
    items: cloneGuestCartItems(items)
  };
  writeStorageItem(GUEST_CART_STORAGE_KEY, serialized);
};

const clearGuestCart = (): void => {
  guestCartCache = { serialized: null, items: [] };
  removeStorageItem(GUEST_CART_STORAGE_KEY);
};

const splitGuestCartSyncItems = (items: GuestCartItem[]): GuestCartSyncPayload =>
  items.reduce<GuestCartSyncPayload>(
    (payload, item) => {
      if (!OBJECT_ID_PATTERN.test(item.product.id)) {
        payload.unsyncedItems.push(item);
        return payload;
      }

      payload.syncItems.push({
        productId: item.product.id,
        quantity: normalizeCartQuantity(item.quantity),
        variantIndex: item.variantIndex
      });

      return payload;
    },
    {
      syncItems: [],
      unsyncedItems: []
    }
  );

const toGuestCartDto = (items: GuestCartItem[]): CartDto | null => {
  if (!items.length) {
    return null;
  }

  const mappedItems = items.map((item) => {
    const variants = getSnapshotVariants(item.product);
    const selectedVariant = item.variantIndex !== undefined ? variants[item.variantIndex] : undefined;
    const unitPrice = selectedVariant?.price ?? item.product.price;
    return {
      id: `guest-${item.product.id}-${item.variantIndex ?? 'base'}`,
      product: item.product,
      quantity: item.quantity,
      variantIndex: item.variantIndex,
      lineTotal: unitPrice * item.quantity
    };
  });

  return {
    id: 'guest-cart',
    items: mappedItems,
    subtotal: mappedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    itemCount: mappedItems.reduce((sum, item) => sum + item.quantity, 0)
  };
};

const toOptimisticCartDto = (
  currentCart: CartDto | null,
  product: CartProductSnapshotDto,
  quantity: number,
  variantIndex?: number
): CartDto => {
  const variants = getSnapshotVariants(product);
  const selectedVariant = variantIndex !== undefined ? variants[variantIndex] : undefined;
  const unitPrice = selectedVariant?.price ?? product.price;
  const itemKey = `${product.id}-${variantIndex ?? 'base'}`;
  const currentItems = currentCart?.items ?? [];
  let matchedExistingItem = false;

  const items = currentItems.map((item) => {
    const currentKey = `${item.product.id}-${item.variantIndex ?? 'base'}`;
    if (currentKey !== itemKey) {
      return item;
    }

    matchedExistingItem = true;
    const nextQuantity = normalizeCartQuantity(item.quantity + quantity);
    return {
      ...item,
      quantity: nextQuantity,
      lineTotal: unitPrice * nextQuantity
    };
  });

  if (!matchedExistingItem) {
    items.push({
      id: `optimistic-${itemKey}`,
      product,
      quantity,
      variantIndex,
      lineTotal: unitPrice * quantity
    });
  }

  return {
    id: currentCart?.id ?? 'optimistic-cart',
    items,
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };
};

export const CartProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const { user, loading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(cartReducer, {
    cart: null,
    loading: true
  });
  const [recentlyAddedItem, setRecentlyAddedItem] = useState<RecentlyAddedCartItem | null>(null);
  const syncRequestIdRef = useRef(0);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let isCancelled = false;
    const requestId = ++syncRequestIdRef.current;
    const isCurrentRequest = (): boolean => !isCancelled && syncRequestIdRef.current === requestId;

    const finish = (payload: CartDto | null): void => {
      if (isCurrentRequest()) {
        dispatch({ type: 'set', payload });
      }
    };

    const syncCartState = async (): Promise<void> => {
      dispatch({ type: 'start' });

      try {
        if (!user) {
          finish(toGuestCartDto(readGuestCart()));
          return;
        }

        const guestItems = readGuestCart();
        if (guestItems.length) {
          const { syncItems, unsyncedItems } = splitGuestCartSyncItems(guestItems);
          if (syncItems.length) {
            try {
              const syncedCart = await cartService.sync(syncItems);
              if (!isCurrentRequest()) {
                return;
              }

              if (unsyncedItems.length) {
                writeGuestCart(unsyncedItems);
                console.warn('Guest cart still contains items that could not be synced and were preserved locally.');
              } else {
                clearGuestCart();
              }
              finish(syncedCart);
              return;
            } catch (error) {
              if (!isNonRetryableSyncError(error)) {
                throw error;
              }

              console.warn('Guest cart sync was rejected; loading the server cart instead.', error);
            }
          } else {
            console.warn('Guest cart contains items that cannot be synced and will be preserved locally.');
          }
        }

        const serverCart = await cartService.get();
        finish(serverCart);
      } catch (error) {
        console.warn('Unable to load cart state', error);
        finish(user ? null : toGuestCartDto(readGuestCart()));
      }
    };

    void syncCartState();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, user]);

  const loadCart = useCallback(async () => {
    dispatch({ type: 'start' });
    if (!user) {
      dispatch({ type: 'set', payload: toGuestCartDto(readGuestCart()) });
      return;
    }
    const serverCart = await cartService.get();
    dispatch({ type: 'set', payload: serverCart });
  }, [user]);

  const addItem = useCallback<CartContextValue['addItem']>(
    async (payload) => {
      const quantity = normalizeCartQuantity(payload.quantity);
      const product = payload.product ? normalizeProductSnapshot(payload.product, quantity) : null;

      if (!user) {
        if (!payload.product) {
          throw new Error('Guest cart items require a product snapshot');
        }

        if (!product) {
          throw new Error('Guest cart items require a valid product snapshot');
        }

        if (!OBJECT_ID_PATTERN.test(payload.productId) || product.id !== payload.productId) {
          throw new Error('This product cannot be added to the guest cart right now.');
        }

        const variantIndex = resolveRequestedSnapshotVariantIndex(product, payload.variantIndex);
        const guestItems = readGuestCart();
        const existingIndex = guestItems.findIndex(
          (item) => item.product.id === payload.productId && (item.variantIndex ?? null) === (variantIndex ?? null)
        );
        if (existingIndex >= 0) {
          guestItems[existingIndex].quantity = normalizeCartQuantity(guestItems[existingIndex].quantity + quantity);
        } else {
          guestItems.push({
            product,
            quantity,
            variantIndex
          });
        }
        writeGuestCart(guestItems);
        dispatch({ type: 'set', payload: toGuestCartDto(guestItems) });
        setRecentlyAddedItem({ product, quantity, variantIndex });
        return;
      }

      if (product) {
        const variantIndex = resolveRequestedSnapshotVariantIndex(product, payload.variantIndex);
        dispatch({ type: 'set', payload: toOptimisticCartDto(state.cart, product, quantity, variantIndex) });
      } else {
        dispatch({ type: 'start' });
      }

      try {
        const { product: _productSnapshot, ...serverPayload } = payload;
        const serverCart = await cartService.add(serverPayload);
        dispatch({ type: 'set', payload: serverCart });
        if (product) {
          setRecentlyAddedItem({
            product,
            quantity,
            variantIndex: resolveRequestedSnapshotVariantIndex(product, payload.variantIndex)
          });
        }
      } catch (error) {
        if (product) {
          dispatch({ type: 'set', payload: state.cart });
        }
        throw error;
      }
    },
    [state.cart, user]
  );

  const updateItem = useCallback<CartContextValue['updateItem']>(
    async (itemId, quantity) => {
      dispatch({ type: 'start' });
      if (!user) {
        const nextQuantity = normalizeCartQuantity(quantity);
        const guestItems = readGuestCart().map((item) =>
          `guest-${item.product.id}-${item.variantIndex ?? 'base'}` === itemId ? { ...item, quantity: nextQuantity } : item
        );
        writeGuestCart(guestItems);
        dispatch({ type: 'set', payload: toGuestCartDto(guestItems) });
        return;
      }
      const serverCart = await cartService.update(itemId, quantity);
      dispatch({ type: 'set', payload: serverCart });
    },
    [user]
  );

  const removeItem = useCallback<CartContextValue['removeItem']>(
    async (itemId) => {
      dispatch({ type: 'start' });
      if (!user) {
        const guestItems = readGuestCart().filter((item) => `guest-${item.product.id}-${item.variantIndex ?? 'base'}` !== itemId);
        writeGuestCart(guestItems);
        dispatch({ type: 'set', payload: toGuestCartDto(guestItems) });
        return;
      }
      const serverCart = await cartService.remove(itemId);
      dispatch({ type: 'set', payload: serverCart });
    },
    [user]
  );

  const clearCart = useCallback<CartContextValue['clearCart']>(async () => {
    dispatch({ type: 'start' });
    if (!user) {
      clearGuestCart();
      dispatch({ type: 'set', payload: null });
      return;
    }
    await cartService.clear();
    dispatch({ type: 'set', payload: null });
  }, [user]);

  const dismissRecentlyAddedItem = useCallback(() => {
    setRecentlyAddedItem(null);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      recentlyAddedItem,
      dismissRecentlyAddedItem,
      loadCart,
      addItem,
      updateItem,
      removeItem,
      clearCart
    }),
    [addItem, clearCart, dismissRecentlyAddedItem, loadCart, recentlyAddedItem, removeItem, state, updateItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
};
