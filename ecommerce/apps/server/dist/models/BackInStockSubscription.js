import { Schema, model } from 'mongoose';
const backInStockSubscriptionSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantIndex: { type: Number, min: 0 },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    notifiedAt: { type: Date, default: null }
}, { timestamps: true });
backInStockSubscriptionSchema.index({ product: 1, email: 1, variantIndex: 1 }, {
    unique: true,
    collation: { locale: 'en', strength: 2 }
});
export const BackInStockSubscription = model('BackInStockSubscription', backInStockSubscriptionSchema);
