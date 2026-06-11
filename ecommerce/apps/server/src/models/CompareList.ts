import { Schema, model, type InferSchemaType } from 'mongoose';

const compareListSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String },
    items: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      validate: {
        validator: (items: string[]) => items.length <= 4,
        message: 'Compare list supports up to 4 items'
      },
      default: []
    }
  },
  { timestamps: true }
);

compareListSchema.index({ user: 1 }, { unique: true, sparse: true });
compareListSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

export type CompareListDocument = InferSchemaType<typeof compareListSchema>;
export const CompareList = model<CompareListDocument>('CompareList', compareListSchema);
