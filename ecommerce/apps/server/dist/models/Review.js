import { Schema, model } from 'mongoose';
import { Product } from './Product.js';
const reviewSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    isVerified: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false, index: true },
    isVerifiedBuyer: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0, min: 0 },
    adminReply: { type: String, trim: true, maxlength: 1000 },
    adminRepliedAt: { type: Date }
}, { timestamps: true });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
const syncRatings = async (productId) => {
    const stats = await Review.aggregate([
        { $match: { product: productId, isApproved: true } },
        {
            $group: {
                _id: '$product',
                average: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);
    const rating = stats[0] ?? { average: 0, count: 0 };
    await Product.findByIdAndUpdate(productId, {
        ratings: {
            average: Number(rating.average.toFixed(1)),
            count: rating.count
        }
    });
};
reviewSchema.post('save', async function reviewPostSave() {
    // Only re-sync ratings when the review is new or rating/approval changed
    if (this.isNew || this.isModified('rating') || this.isModified('isApproved')) {
        await syncRatings(this.product);
    }
});
reviewSchema.post('findOneAndUpdate', async function reviewPostUpdate(doc) {
    if (doc) {
        await syncRatings(doc.product);
    }
});
export const Review = model('Review', reviewSchema);
