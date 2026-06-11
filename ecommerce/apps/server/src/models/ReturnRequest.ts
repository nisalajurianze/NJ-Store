import { returnRequestStatuses } from '@njstore/types';
import { Schema, model, type InferSchemaType } from 'mongoose';

const returnRequestItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    variantIndex: { type: Number, min: 0 }
  },
  { _id: false }
);

const returnEvidenceSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    alt: { type: String, trim: true },
    uploadedBy: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const returnRequestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: returnRequestStatuses, default: 'pending', index: true },
    reason: { type: String, required: true, trim: true, maxlength: 1_000 },
    adminNote: { type: String, trim: true, maxlength: 1_000 },
    refundAmount: { type: Number, required: true, min: 0 },
    refundPercent: { type: Number, default: 100, min: 0, max: 100 },
    items: { type: [returnRequestItemSchema], default: [] },
    evidence: { type: [returnEvidenceSchema], default: [] },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    refundedAt: { type: Date },
    inventoryRestoredAt: { type: Date }
  },
  { timestamps: true }
);

returnRequestSchema.index({ user: 1, createdAt: -1 });
returnRequestSchema.index({ order: 1, createdAt: -1 });

export type ReturnRequestDocument = InferSchemaType<typeof returnRequestSchema>;
export const ReturnRequest = model<ReturnRequestDocument>('ReturnRequest', returnRequestSchema);
