import { Schema, model, type InferSchemaType } from 'mongoose';
import { imageSchema } from './shared.js';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    image: { type: imageSchema },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, order: 1 });

export type CategoryDocument = InferSchemaType<typeof categorySchema>;
export const Category = model<CategoryDocument>('Category', categorySchema);
