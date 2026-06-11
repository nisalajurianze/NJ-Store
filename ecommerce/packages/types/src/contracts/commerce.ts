import type { OrderStatus, OrderType, PaymentStatus } from '../constants/enums.js';
import type { AddressDto, ImageAsset } from './common.js';
import type { ProductBundleItemDto, ProductCardDto, ProductSpecificationDto, ProductVariantDto } from './catalog.js';

export interface CartProductSnapshotDto extends ProductCardDto {
  description?: string;
  images?: ImageAsset[];
  variants?: ProductVariantDto[];
  specifications?: ProductSpecificationDto[];
  tags?: string[];
  loyaltyPoints?: number;
  sku?: string;
  weight?: number;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  warranty?: string;
  videoUrl?: string;
  bundleItems?: ProductBundleItemDto[];
}

export interface CartItemDto {
  id: string;
  product: CartProductSnapshotDto;
  quantity: number;
  variantIndex?: number;
  lineTotal: number;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  subtotal: number;
  itemCount: number;
}

export interface CreateQuotationItemDto {
  productId: string;
  quantity: number;
  variantIndex?: number;
}

export interface CreateQuotationRequestDto {
  items: CreateQuotationItemDto[];
  paymentMethod?: 'bank_transfer' | 'cash_on_delivery';
  type?: OrderType;
  addressId?: string;
  shippingAddress?: AddressDto;
  pickupSlot?: string;
  deliveryNotes?: string;
  notes?: string;
  couponCode?: string;
  loyaltyPointsToRedeem?: number;
  idempotencyKey?: string;
}

export interface ConfirmQuotationRequestDto {
  paymentMethod?: 'bank_transfer' | 'cash_on_delivery';
  type?: OrderType;
  addressId?: string;
  shippingAddress?: AddressDto;
  pickupSlot?: string;
  deliveryNotes?: string;
  loyaltyPointsToRedeem?: number;
}

export interface ShippingResultDto {
  fee: number;
  label: string;
  days: string;
}

export interface CouponApplicationDto {
  couponId: string;
  code: string;
  discount: number;
  finalTotal: number;
  freeShipping?: boolean;
  autoApplied?: boolean;
}

export interface OrderItemDto {
  product: string;
  name: string;
  slug: string;
  image?: ImageAsset;
  quantity: number;
  price: number;
  variantLabel?: string;
  sku: string;
  bundleItems?: ProductBundleItemDto[];
}

export interface OrderTimelineEntryDto {
  status: OrderStatus;
  note: string;
  createdAt: string;
  actor?: string;
}

export interface OrderReceiptDto extends ImageAsset {
  id: string;
  createdAt?: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  quotationNumber?: string;
  quotationToken?: string;
  quotationExpiry?: string;
  isQuotation: boolean;
  fulfilmentConfigured?: boolean;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'bank_transfer' | 'cash_on_delivery';
  subtotal: number;
  shippingFee: number;
  discount: number;
  taxAmount?: number;
  taxLabel?: string;
  taxRate?: number;
  total: number;
  shippingAddress?: AddressDto;
  pickupSlot?: string;
  notes?: string;
  deliveryNotes?: string;
  couponCode?: string;
  items: OrderItemDto[];
  trackingNumber?: string;
  receipts: OrderReceiptDto[];
  receipt?: ImageAsset;
  receiptRejectionReason?: string;
  quotationPdf?: ImageAsset;
  invoicePdf?: ImageAsset;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryDays?: string;
  estimatedDeliveryDate?: string;
  loyaltyPointsAwarded: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscount: number;
  timeline: OrderTimelineEntryDto[];
}

export interface ReceiptUploadDto {
  orderId: string;
  receipts: OrderReceiptDto[];
}

export interface WishlistDto {
  items: string[];
}

export interface CompareListDto {
  items: string[];
}

export interface DashboardSummaryDto {
  recentOrders: OrderDto[];
  totalOrders: number;
  wishlistCount: number;
  loyaltyPoints: number;
}
