import { Schema, model } from 'mongoose';
export const CUSTOMER_BEHAVIOR_EVENTS = [
    'page_view',
    'view_item',
    'add_to_cart',
    'remove_from_cart',
    'update_cart_quantity',
    'view_cart',
    'begin_checkout',
    'quotation_created',
    'purchase_completed',
    'sign_in',
    'sign_up',
    'search',
    'add_to_wishlist',
    'remove_from_wishlist',
    'filter_applied'
];
const customerBehaviorEventSchema = new Schema({
    event: { type: String, enum: CUSTOMER_BEHAVIOR_EVENTS, required: true, index: true },
    anonymousId: { type: String, required: true, trim: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    funnelStep: { type: String, trim: true, index: true },
    source: { type: String, trim: true },
    medium: { type: String, trim: true },
    campaign: { type: String, trim: true },
    path: { type: String, trim: true, index: true },
    search: { type: String, trim: true },
    pageType: { type: String, trim: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    productName: { type: String, trim: true },
    productSlug: { type: String, trim: true },
    brand: { type: String, trim: true },
    category: { type: String, trim: true },
    searchQuery: { type: String, trim: true },
    resultCount: { type: Number, min: 0 },
    quantity: { type: Number, min: 0 },
    value: { type: Number, min: 0 },
    createdAt: { type: Date, required: true, default: Date.now, index: true }
}, {
    versionKey: false
});
customerBehaviorEventSchema.index({ createdAt: -1, event: 1 });
customerBehaviorEventSchema.index({ product: 1, event: 1, createdAt: -1 });
customerBehaviorEventSchema.index({ path: 1, createdAt: -1 });
customerBehaviorEventSchema.index({ anonymousId: 1, createdAt: -1 });
export const CustomerBehaviorEvent = model('CustomerBehaviorEvent', customerBehaviorEventSchema);
