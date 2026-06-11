import { Schema, model } from 'mongoose';
const loyaltyTransactionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    type: { type: String, enum: ['earned', 'redeemed', 'adjusted'], required: true },
    points: { type: Number, required: true },
    description: { type: String, required: true, trim: true }
}, { timestamps: true });
loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
export const LoyaltyTransaction = model('LoyaltyTransaction', loyaltyTransactionSchema);
