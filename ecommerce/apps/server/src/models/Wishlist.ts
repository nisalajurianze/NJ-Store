import { Schema, model, type InferSchemaType } from 'mongoose';

const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
);

export type WishlistDocument = InferSchemaType<typeof wishlistSchema>;
export const Wishlist = model<WishlistDocument>('Wishlist', wishlistSchema);
