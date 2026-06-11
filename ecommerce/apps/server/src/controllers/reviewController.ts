import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { reviewService } from '../services/reviewService.js';

export const listProductReviews = catchAsync(async (req, res) => {
  const data = await reviewService.listProductReviews(String(req.params.productId), req.user?.id);
  sendResponse(res, 200, data);
});

export const createReview = catchAsync(async (req, res) => {
  const data = await reviewService.createReview(req.user!.id, req.body);
  sendResponse(res, 201, data, 'Review submitted for moderation');
});

export const toggleHelpfulVote = catchAsync(async (req, res) => {
  const data = await reviewService.toggleHelpfulVote(String(req.params.id), req.user!.id);
  sendResponse(res, 200, data);
});
