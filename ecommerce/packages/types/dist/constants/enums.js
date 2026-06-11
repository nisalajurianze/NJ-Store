export const roles = ['customer', 'staff', 'admin'];
export const languages = ['en', 'si'];
export const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
export const paymentStatuses = ['unpaid', 'receipt_uploaded', 'paid', 'rejected'];
export const orderTypes = ['delivery', 'pickup'];
export const returnRequestStatuses = ['pending', 'approved', 'rejected', 'refunded'];
export const notificationTypes = [
    'system',
    'return_request_created',
    'return_request_approved',
    'return_request_rejected',
    'return_request_refunded',
    'product_question_answered'
];
export const couponTypes = ['percentage', 'fixed', 'free_shipping', 'bogo'];
export const productTypes = ['standard', 'bundle'];
export const productConditions = ['new', 'used'];
export const sortOptions = ['-createdAt', 'price_asc', 'price_desc', 'rating', 'popular'];
