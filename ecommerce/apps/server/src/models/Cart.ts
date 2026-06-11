import { Schema, model, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    variantIndex: { type: Number, min: 0 }
  },
  { timestamps: false }
);

const abandonedRecoveryEmailSchema = new Schema(
  {
    stageHours: { type: Number, required: true, enum: [24, 48, 72] },
    cartUpdatedAt: { type: Date, required: true },
    sentAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String },
    version: { type: Number, required: true, default: 1, min: 1 },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: (v: unknown[]) => v.length <= 50,
        message: 'Cart cannot exceed 50 items'
      }
    },
    abandonedRecoveryEmails: { type: [abandonedRecoveryEmailSchema], default: [] }
  },
  { timestamps: true }
);

cartSchema.index({ user: 1 }, { unique: true, sparse: true });
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
cartSchema.index({ updatedAt: -1 });
cartSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { user: null }
  }
);

export type CartDocument = InferSchemaType<typeof cartSchema>;
export const Cart = model<CartDocument>('Cart', cartSchema);
