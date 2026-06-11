import { Schema, model, type InferSchemaType } from 'mongoose';

const reviewHelpfulVoteSchema = new Schema(
  {
    review: { type: Schema.Types.ObjectId, ref: 'Review', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: true }
);

reviewHelpfulVoteSchema.index({ review: 1, user: 1 }, { unique: true });
reviewHelpfulVoteSchema.index({ user: 1, review: 1 });

export type ReviewHelpfulVoteDocument = InferSchemaType<typeof reviewHelpfulVoteSchema>;
export const ReviewHelpfulVote = model<ReviewHelpfulVoteDocument>('ReviewHelpfulVote', reviewHelpfulVoteSchema);
