import { Schema, model, type InferSchemaType } from 'mongoose';

const couponUsageSchema = new Schema(
  {
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    usedAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: false }
);

couponUsageSchema.index({ coupon: 1, user: 1 });

export type CouponUsageDocument = InferSchemaType<typeof couponUsageSchema>;
export const CouponUsage = model<CouponUsageDocument>('CouponUsage', couponUsageSchema);
