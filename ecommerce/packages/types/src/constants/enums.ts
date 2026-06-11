export const roles = ['customer', 'staff', 'admin'] as const;
export type Role = (typeof roles)[number];

export const languages = ['en', 'si'] as const;
export type Language = (typeof languages)[number];

export const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const paymentStatuses = ['unpaid', 'receipt_uploaded', 'paid', 'rejected'] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const orderTypes = ['delivery', 'pickup'] as const;
export type OrderType = (typeof orderTypes)[number];

export const returnRequestStatuses = ['pending', 'approved', 'rejected', 'refunded'] as const;
export type ReturnRequestStatus = (typeof returnRequestStatuses)[number];

export const notificationTypes = [
  'system',
  'return_request_created',
  'return_request_approved',
  'return_request_rejected',
  'return_request_refunded',
  'product_question_answered'
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const couponTypes = ['percentage', 'fixed', 'free_shipping', 'bogo'] as const;
export type CouponType = (typeof couponTypes)[number];

export const productTypes = ['standard', 'bundle'] as const;
export type ProductType = (typeof productTypes)[number];

export const productConditions = ['new', 'used'] as const;
export type ProductCondition = (typeof productConditions)[number];

export const sortOptions = ['-createdAt', 'price_asc', 'price_desc', 'rating', 'popular'] as const;
export type ProductSort = (typeof sortOptions)[number];
