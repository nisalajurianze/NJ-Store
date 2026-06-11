import { Schema, model } from 'mongoose';
const reviewHelpfulVoteSchema = new Schema({
    review: { type: Schema.Types.ObjectId, ref: 'Review', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });
reviewHelpfulVoteSchema.index({ review: 1, user: 1 }, { unique: true });
reviewHelpfulVoteSchema.index({ user: 1, review: 1 });
export const ReviewHelpfulVote = model('ReviewHelpfulVote', reviewHelpfulVoteSchema);
