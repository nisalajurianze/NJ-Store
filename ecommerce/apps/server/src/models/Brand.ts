import { Schema, model, type InferSchemaType } from 'mongoose';
import { imageSchema } from './shared.js';

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, unique: true, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    logo: { type: imageSchema },
    description: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

brandSchema.index({ isActive: 1, sortOrder: 1, name: 1 });

brandSchema.virtual('logoUrl').get(function brandLogoUrlGetter() {
  return this.logo?.url ?? undefined;
});

export type BrandDocument = InferSchemaType<typeof brandSchema>;
export const Brand = model<BrandDocument>('Brand', brandSchema);
