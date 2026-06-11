import type { AdminOrderDto, ImageAsset, ProductVariantDto, UserSummary } from '@njstore/types';
import { formatCurrency } from '@njstore/utils';

export { formatCurrency };

export type OrderRecord = AdminOrderDto;
export type UserRecord = Pick<UserSummary, 'id' | 'name' | 'email' | 'phone' | 'role' | 'isActive'>;
export type OrderStatusFilter = OrderRecord['status'] | 'all';
export type PaymentStatusFilter = OrderRecord['paymentStatus'] | 'all';
export type QuickOrderFilter = 'all' | 'payment_review' | 'active_fulfilment' | 'delivered' | 'cancelled';
export type BulkStatusValue = Extract<OrderRecord['status'], 'processing' | 'shipped' | 'delivered' | 'cancelled'>;
export type ManualOrderStatusValue = Extract<OrderRecord['status'], 'pending' | 'processing' | 'shipped' | 'delivered'>;
export type ManualOrderPaymentStatusValue = Extract<OrderRecord['paymentStatus'], 'unpaid' | 'paid'>;

export type ManualOrderProductOption = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  sku?: string;
  productType?: 'standard' | 'bundle';
  bundleStock?: number | null;
  isActive?: boolean;
  variants?: ProductVariantDto[];
  images?: ImageAsset[];
  thumbnail?: ImageAsset;
};

export interface ManualOrderItemForm {
  productId: string;
  variantIndex: string;
  quantity: string;
}

export interface ManualOrderFormState {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  type: 'delivery' | 'pickup';
  paymentMethod: OrderRecord['paymentMethod'];
  paymentStatus: ManualOrderPaymentStatusValue;
  status: ManualOrderStatusValue;
  trackingNumber: string;
  assignedToId: string;
  shippingFee: string;
  discount: string;
  notes: string;
  deliveryNotes: string;
  pickupSlot: string;
  shippingAddress: {
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
  };
  items: ManualOrderItemForm[];
}

export interface ListQueryResult<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const createManualOrderItem = (): ManualOrderItemForm => ({
  productId: '',
  variantIndex: '',
  quantity: '1'
});

export const createManualOrderForm = (): ManualOrderFormState => ({
  customerId: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  type: 'delivery',
  paymentMethod: 'bank_transfer',
  paymentStatus: 'unpaid',
  status: 'pending',
  trackingNumber: '',
  assignedToId: '',
  shippingFee: '',
  discount: '',
  notes: '',
  deliveryNotes: '',
  pickupSlot: '',
  shippingAddress: {
    label: 'Delivery',
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    district: '',
    postalCode: '',
    country: 'Sri Lanka'
  },
  items: [createManualOrderItem()]
});

export const formatDateTime = (value: string | undefined): string => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export const formatFulfilmentType = (value?: string): string => (value ? value.replaceAll('_', ' ') : 'Not set');

export const getProductOptionId = (product: ManualOrderProductOption): string => product.id ?? product._id ?? '';

export const getProductStock = (product: ManualOrderProductOption): number =>
  product.productType === 'bundle'
    ? product.bundleStock ?? 0
    : (product.variants ?? []).reduce((sum, variant) => sum + variant.stock, 0);

export const formatVariantLabel = (variant: ProductVariantDto, index: number): string => {
  const label = [variant.color, variant.storage, variant.model].filter(Boolean).join(' / ');
  return `${label || `Variant ${index + 1}`} • ${variant.sku} • ${variant.stock} left`;
};

export const getManualOrderLinePrice = (
  product: ManualOrderProductOption | undefined,
  variantIndex: string
): number => {
  if (!product) {
    return 0;
  }

  const parsedVariantIndex = variantIndex.trim() ? Number(variantIndex) : undefined;
  const variant = parsedVariantIndex !== undefined ? product.variants?.[parsedVariantIndex] : undefined;
  return variant?.price ?? product.price;
};

export const parseOptionalAmount = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const amount = Number(trimmed);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
};

const normalizeComparableText = (value?: string): string => value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';

const getStatusStartedAt = (order: OrderRecord): string | undefined => {
  const matchingTimelineEntry = [...(order.timeline ?? [])]
    .filter((entry) => entry.status === order.status)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .at(-1);

  return matchingTimelineEntry?.createdAt ?? order.updatedAt ?? order.createdAt;
};

const getStatusAgeDays = (order: OrderRecord): number => {
  const startedAt = getStatusStartedAt(order);
  if (!startedAt) {
    return 0;
  }

  return (Date.now() - new Date(startedAt).getTime()) / 86_400_000;
};

export const formatStatusAge = (order: OrderRecord): string => {
  const days = getStatusAgeDays(order);
  if (days >= 1) {
    const roundedDays = Math.max(1, Math.floor(days));
    return `${roundedDays} day${roundedDays === 1 ? '' : 's'}`;
  }

  const hours = Math.max(1, Math.floor(days * 24));
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

export const getSlaStatus = (order: OrderRecord): 'overdue' | 'warning' | 'ok' => {
  if (order.status !== 'pending' && order.status !== 'processing') return 'ok';
  const days = getStatusAgeDays(order);
  if (days > 3) return 'overdue';
  if (days > 1.5) return 'warning';
  return 'ok';
};

const areEquivalentAddresses = (left?: OrderRecord['shippingAddress'], right?: OrderRecord['shippingAddress']): boolean => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return [
    left.label,
    left.fullName,
    left.phone,
    left.line1,
    left.line2,
    left.city,
    left.district,
    left.postalCode,
    left.country
  ].every((value, index) =>
    normalizeComparableText(value) ===
    normalizeComparableText(
      [right.label, right.fullName, right.phone, right.line1, right.line2, right.city, right.district, right.postalCode, right.country][index]
    )
  );
};

export const getOrderStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'processing' || status === 'shipped') return 'info';
  return 'default';
};

export const getPaymentStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'paid') return 'success';
  if (status === 'receipt_uploaded') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'default';
};

export const getQuickFilterLabel = (filter: QuickOrderFilter): string => {
  switch (filter) {
    case 'payment_review':
      return 'Receipts to review';
    case 'active_fulfilment':
      return 'In fulfilment';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'All visible orders';
  }
};

export const matchesQuickFilter = (order: OrderRecord, filter: QuickOrderFilter): boolean => {
  switch (filter) {
    case 'payment_review':
      return order.paymentStatus === 'receipt_uploaded';
    case 'active_fulfilment':
      return order.status === 'processing' || order.status === 'shipped';
    case 'delivered':
      return order.status === 'delivered';
    case 'cancelled':
      return order.status === 'cancelled';
    default:
      return true;
  }
};

export const parseOrderStatusFilter = (value: string | null): OrderStatusFilter => {
  if (value === 'pending' || value === 'processing' || value === 'shipped' || value === 'delivered' || value === 'cancelled') {
    return value;
  }

  return 'all';
};

export const parsePaymentStatusFilter = (value: string | null): PaymentStatusFilter => {
  if (value === 'unpaid' || value === 'receipt_uploaded' || value === 'paid' || value === 'rejected') {
    return value;
  }

  return 'all';
};

export const parseQuickOrderFilter = (value: string | null): QuickOrderFilter => {
  if (value === 'payment_review' || value === 'active_fulfilment' || value === 'delivered' || value === 'cancelled') {
    return value;
  }

  return 'all';
};

export const getMergePreview = (
  selectedOrders: OrderRecord[]
): {
  enabled: boolean;
  message: string;
  keepOrder?: OrderRecord;
  mergeOrder?: OrderRecord;
} => {
  if (selectedOrders.length !== 2) {
    return { enabled: false, message: 'Select exactly two orders to merge.' };
  }

  const [keepOrder, mergeOrder] = [...selectedOrders].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );

  if (!keepOrder || !mergeOrder) {
    return { enabled: false, message: 'Select exactly two orders to merge.' };
  }

  if (!keepOrder.customer?.id || keepOrder.customer.id !== mergeOrder.customer?.id) {
    return { enabled: false, message: 'Only orders from the same customer can be merged.' };
  }

  if (!['pending', 'processing'].includes(keepOrder.status) || !['pending', 'processing'].includes(mergeOrder.status)) {
    return { enabled: false, message: 'Only pending or processing orders can be merged.' };
  }

  if (!['unpaid', 'receipt_uploaded'].includes(keepOrder.paymentStatus) || !['unpaid', 'receipt_uploaded'].includes(mergeOrder.paymentStatus)) {
    return { enabled: false, message: 'Only unpaid or receipt-review orders can be merged.' };
  }

  if (keepOrder.type !== mergeOrder.type) {
    return { enabled: false, message: 'Orders must share the same fulfilment type before merging.' };
  }

  if (keepOrder.paymentMethod !== mergeOrder.paymentMethod) {
    return { enabled: false, message: 'Orders must share the same payment method before merging.' };
  }

  if (keepOrder.type === 'delivery' && !areEquivalentAddresses(keepOrder.shippingAddress, mergeOrder.shippingAddress)) {
    return { enabled: false, message: 'Delivery orders must share the same destination before merging.' };
  }

  if (keepOrder.type === 'pickup' && normalizeComparableText(keepOrder.pickupSlot) !== normalizeComparableText(mergeOrder.pickupSlot)) {
    return { enabled: false, message: 'Pickup orders must share the same pickup slot before merging.' };
  }

  return {
    enabled: true,
    message: `Keeps ${keepOrder.orderNumber} and folds ${mergeOrder.orderNumber} into it.`,
    keepOrder,
    mergeOrder
  };
};
