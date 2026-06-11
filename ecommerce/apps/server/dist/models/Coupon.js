import { Schema, model } from 'mongoose';
const bogoConfigSchema = new Schema({
    buyQuantity: { type: Number, required: true, min: 1, default: 1 },
    getQuantity: { type: Number, required: true, min: 1, default: 1 }
}, { _id: false });
const couponSchema = new Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['percentage', 'fixed', 'free_shipping', 'bogo'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, min: 0, default: 0 },
    maxDiscount: { type: Number, min: 0 },
    restrictToEmail: { type: String, trim: true, lowercase: true, index: true },
    appliesToCategories: { type: [Schema.Types.ObjectId], ref: 'Category', default: [] },
    appliesToBrands: { type: [Schema.Types.ObjectId], ref: 'Brand', default: [] },
    perUserLimit: { type: Number, required: true, min: 1, default: 1 },
    isFirstOrderOnly: { type: Boolean, default: false, index: true },
    autoApply: { type: Boolean, default: false, index: true },
    bogo: { type: bogoConfigSchema, default: undefined },
    expiryDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });
couponSchema.index({ code: 1, isActive: 1 });
export const Coupon = model('Coupon', couponSchema);
