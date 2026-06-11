import sanitizeHtml from 'sanitize-html';
import { Schema, model } from 'mongoose';
import { imageSchema } from './shared.js';
const variantSchema = new Schema({
    color: { type: String, trim: true },
    colorCode: { type: String, trim: true },
    storage: { type: String, trim: true },
    model: { type: String, trim: true },
    attributes: {
        type: [
            new Schema({
                name: { type: String, required: true, trim: true, maxlength: 40 },
                value: { type: String, required: true, trim: true, maxlength: 80 }
            }, { _id: false })
        ],
        default: []
    },
    glowColor: { type: String, trim: true },
    images: { type: [imageSchema], default: [] },
    price: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    sku: { type: String, required: true, trim: true }
}, { _id: false });
const specificationSchema = new Schema({
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
}, { _id: false });
const bundleItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    variantIndex: { type: Number, min: 0 }
}, { _id: false });
const productSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true, maxlength: 500 },
    price: { type: Number, required: true, min: 0, index: true },
    comparePrice: { type: Number, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    brandName: { type: String, trim: true, index: true },
    condition: { type: String, enum: ['new', 'used'], default: 'new', index: true },
    images: { type: [imageSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    specifications: { type: [specificationSchema], default: [] },
    productType: { type: String, enum: ['standard', 'bundle'], default: 'standard', index: true },
    bundleItems: { type: [bundleItemSchema], default: [] },
    bundleStock: { type: Number, default: 0, min: 0 },
    ratings: {
        average: { type: Number, default: 0, min: 0, max: 5, index: true },
        count: { type: Number, default: 0 }
    },
    isBestSeller: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isFlashDeal: { type: Boolean, default: false, index: true },
    flashDealEndsAt: { type: Date, index: true },
    isActive: { type: Boolean, default: true, index: true },
    tags: { type: [String], default: [], index: true },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    sku: { type: String, required: true, trim: true, unique: true, index: true },
    weight: { type: Number, min: 0 },
    soldCount: { type: Number, default: 0, min: 0, index: true },
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    canonicalUrl: { type: String, trim: true, maxlength: 2048 },
    publishAt: { type: Date, index: true },
    warranty: { type: String, trim: true },
    videoUrl: { type: String, trim: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
productSchema.index({ name: 'text', description: 'text', brandName: 'text', tags: 'text' });
productSchema.index({ category: 1, brand: 1, condition: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isBestSeller: 1, isFlashDeal: 1 });
productSchema.index({ 'bundleItems.product': 1, productType: 1 });
productSchema.index({ isActive: 1, publishAt: 1, createdAt: -1 });
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ isActive: 1, soldCount: -1 });
productSchema.index({ isActive: 1, 'ratings.average': -1 });
productSchema.virtual('discountPercentage').get(function discountPercentageGetter() {
    if (!this.comparePrice || this.comparePrice <= this.price) {
        return 0;
    }
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});
productSchema.virtual('stock').get(function stockGetter() {
    if (this.productType === 'bundle') {
        return this.bundleStock ?? 0;
    }
    return this.variants.reduce((sum, variant) => sum + variant.stock, 0);
});
productSchema.pre('save', function productPreSave(next) {
    if (this.isModified('description')) {
        this.description = sanitizeHtml(this.description, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
            allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                img: ['src', 'alt']
            }
        });
    }
    if (this.isModified('shortDescription')) {
        this.shortDescription = sanitizeHtml(this.shortDescription, { allowedTags: [], allowedAttributes: {} });
    }
    next();
});
export const Product = model('Product', productSchema);
