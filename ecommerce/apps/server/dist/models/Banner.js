import { Schema, model } from 'mongoose';
import { imageSchema } from './shared.js';
const bannerMediaSchema = new Schema({
    kind: { type: String, enum: ['image', 'video'], default: 'image' },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, trim: true, maxlength: 180 },
    poster: { type: imageSchema, default: null }
}, { _id: false });
const bannerAdSlotSchema = new Schema({
    slotKey: { type: String, required: true, enum: ['slot-1', 'slot-2', 'slot-3'] },
    eyebrow: { type: String, trim: true, maxlength: 60 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 220 },
    ctaUrl: { type: String, trim: true, maxlength: 180 },
    mediaItems: { type: [bannerMediaSchema], default: [] },
    isActive: { type: Boolean, default: true }
}, { _id: false });
const bannerFeaturePromoSchema = new Schema({
    eyebrow: { type: String, trim: true, maxlength: 60 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 320 },
    ctaText: { type: String, trim: true, maxlength: 80 },
    ctaUrl: { type: String, trim: true, maxlength: 180 },
    secondaryCtaText: { type: String, trim: true, maxlength: 80 },
    secondaryCtaUrl: { type: String, trim: true, maxlength: 180 },
    mediaItems: { type: [bannerMediaSchema], default: [] },
    isActive: { type: Boolean, default: false }
}, { _id: false });
const showcaseFeatureItemSchema = new Schema({
    icon: { type: String, required: true, enum: ['camera', 'memory', 'storage', 'battery', 'display', 'chip', 'audio', 'connectivity'] },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    value: { type: String, required: true, trim: true, maxlength: 80 }
}, { _id: false });
const showcaseFeatureGroupSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    items: { type: [showcaseFeatureItemSchema], default: [] }
}, { _id: false });
const bannerSchema = new Schema({
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    campaignLabel: { type: String, required: true, trim: true, maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    subtitle: { type: String, required: true, trim: true, maxlength: 500 },
    ctaText: { type: String, required: true, trim: true, maxlength: 80 },
    ctaUrl: { type: String, required: true, trim: true, maxlength: 160 },
    accentText: { type: String, trim: true, maxlength: 180 },
    secondaryCtaText: { type: String, trim: true, maxlength: 80 },
    secondaryCtaUrl: { type: String, trim: true, maxlength: 160 },
    // Legacy fields removed: heroHighlights, heroSignalCards, heroSupportCards
    heroCornerImage: { type: imageSchema, default: null },
    heroCornerImageEnabled: { type: Boolean, default: true },
    heroCornerImageSize: { type: Number, default: 108, min: 48, max: 180 },
    heroBottomLeftImage: { type: imageSchema, default: null },
    heroBottomLeftImageEnabled: { type: Boolean, default: true },
    heroBottomLeftImageSize: { type: Number, default: 108, min: 48, max: 180 },
    heroBottomRightImage: { type: imageSchema, default: null },
    heroBottomRightImageEnabled: { type: Boolean, default: true },
    heroBottomRightImageSize: { type: Number, default: 108, min: 48, max: 180 },
    backgroundImage: { type: imageSchema, default: null },
    adSlots: { type: [bannerAdSlotSchema], default: [] },
    featurePromo: { type: bannerFeaturePromoSchema, default: null },
    heroSpotlightProduct: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    showcaseProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    showcaseFeatureGroups: { type: [showcaseFeatureGroupSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true }
}, {
    timestamps: true
});
bannerSchema.index({ key: 1, isActive: 1 });
export const Banner = model('Banner', bannerSchema);
