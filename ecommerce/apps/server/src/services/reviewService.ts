import { Types } from 'mongoose';
import type { ReviewDto } from '@njstore/types';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { ReviewHelpfulVote } from '../models/ReviewHelpfulVote.js';
import { AppError } from '../utils/AppError.js';
import { serializeReview } from '../utils/serializers.js';
import { auditLogService } from './auditLogService.js';
import { socketService } from './socketService.js';

export const reviewService = {
  listProductReviews: async (productId: string, viewerId?: string): Promise<ReviewDto[]> => {
    const reviews = await Review.find({ product: productId, isApproved: true })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const viewerHelpfulVoteReviewIds = viewerId
      ? new Set(
          (
            await ReviewHelpfulVote.find({
              user: new Types.ObjectId(viewerId),
              review: { $in: reviews.map((review) => review._id) }
            })
              .select('review')
              .lean<Array<{ review: Types.ObjectId }>>()
          ).map((vote) => vote.review.toString())
        )
      : undefined;

    return reviews.map((review) =>
      serializeReview(
        review.toObject() as unknown as Parameters<typeof serializeReview>[0],
        viewerHelpfulVoteReviewIds ? { viewerHasHelpfulVote: viewerHelpfulVoteReviewIds.has(review._id.toString()) } : undefined
      )
    );
  },

  createReview: async (
    userId: string,
    payload: {
      product: string;
      rating: number;
      title: string;
      comment: string;
    }
  ): Promise<ReviewDto> => {
    const deliveredOrder = await Order.findOne({
      user: userId,
      status: 'delivered',
      'items.product': new Types.ObjectId(payload.product)
    });
    if (!deliveredOrder) {
      throw new AppError('Only customers with delivered orders can review this product', 400);
    }
    const reviewedOrderItem = deliveredOrder.items.find((item) => item.product.toString() === payload.product);

    const existing = await Review.findOne({
      product: payload.product,
      user: userId
    });
    if (existing) {
      throw new AppError('You have already reviewed this product', 409);
    }

    const review = await Review.create({
      product: payload.product,
      user: userId,
      order: deliveredOrder._id,
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      isVerified: true,
      isVerifiedBuyer: true,
      isApproved: false
    });
    await review.populate('user', 'name');
    const customerName = (review.user as unknown as { name?: string }).name ?? 'Customer';
    await auditLogService.record({
      action: 'review.create',
      actorUserId: userId,
      actorRole: 'customer',
      targetType: 'review',
      targetId: review._id.toString(),
      targetLabel: review.title,
      message: 'Review submitted for moderation',
      metadata: { productId: payload.product, rating: payload.rating }
    });
    socketService.emitToAdmin('review_created', {
      id: review._id.toString(),
      productId: payload.product,
      productName: reviewedOrderItem?.name ?? 'Product',
      customerName,
      rating: payload.rating,
      title: payload.title,
      createdAt: review.createdAt.toISOString()
    });
    return serializeReview(review.toObject() as unknown as Parameters<typeof serializeReview>[0], { viewerHasHelpfulVote: false });
  },

  toggleHelpfulVote: async (reviewId: string, userId: string): Promise<ReviewDto> => {
    const reviewObjectId = new Types.ObjectId(reviewId);
    const userObjectId = new Types.ObjectId(userId);
    const reviewExists = await Review.exists({ _id: reviewObjectId });
    if (!reviewExists) {
      throw new AppError('Review not found', 404);
    }

    const existingVote = await ReviewHelpfulVote.findOneAndDelete({
      review: reviewObjectId,
      user: userObjectId
    });

    let viewerHasHelpfulVote = false;
    if (existingVote) {
      await Review.findByIdAndUpdate(reviewObjectId, { $inc: { helpfulVotes: -1 } });
    } else {
      try {
        await ReviewHelpfulVote.create({
          review: reviewObjectId,
          user: userObjectId
        });
        await Review.findByIdAndUpdate(reviewObjectId, { $inc: { helpfulVotes: 1 } });
        viewerHasHelpfulVote = true;
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
          viewerHasHelpfulVote = true;
        } else {
          throw error;
        }
      }
    }

    const review = await Review.findById(reviewObjectId).populate('user', 'name');
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (review.helpfulVotes < 0) {
      review.helpfulVotes = 0;
      await review.save();
    }

    return serializeReview(review.toObject() as unknown as Parameters<typeof serializeReview>[0], { viewerHasHelpfulVote });
  },

  moderateReview: async (reviewId: string, isApproved: boolean): Promise<ReviewDto> => {
    const review = await Review.findByIdAndUpdate(reviewId, { isApproved }, { new: true }).populate('user', 'name');
    if (!review) {
      throw new AppError('Review not found', 404);
    }
    return serializeReview(review.toObject() as unknown as Parameters<typeof serializeReview>[0]);
  },

  replyToReview: async (reviewId: string, adminReply: string): Promise<ReviewDto> => {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { adminReply: adminReply.trim(), adminRepliedAt: new Date() },
      { new: true }
    ).populate('user', 'name');
    if (!review) {
      throw new AppError('Review not found', 404);
    }
    return serializeReview(review.toObject() as unknown as Parameters<typeof serializeReview>[0]);
  },

  listPendingReviews: async (): Promise<ReviewDto[]> => {
    const reviews = await Review.find({ isApproved: false })
      .populate('user', 'name')
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    return reviews.map((review) =>
      serializeReview(review.toObject() as unknown as Parameters<typeof serializeReview>[0])
    );
  }
};
