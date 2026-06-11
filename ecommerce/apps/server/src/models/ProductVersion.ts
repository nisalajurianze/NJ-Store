import { Schema, model, type InferSchemaType } from 'mongoose';

const productVersionSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    version: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    commitMessage: { type: String, trim: true, default: 'Updated product details' }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productVersionSchema.index({ product: 1, version: 1 }, { unique: true });
productVersionSchema.index({ product: 1, createdAt: -1 });

export type ProductVersionDocument = InferSchemaType<typeof productVersionSchema>;
export const ProductVersion = model<ProductVersionDocument>('ProductVersion', productVersionSchema);
