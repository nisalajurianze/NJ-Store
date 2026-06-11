import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { newsletterService } from '../services/newsletterService.js';

export const subscribeToNewsletter = catchAsync(async (req, res) => {
  const data = await newsletterService.subscribe(req.body);
  sendResponse(res, 200, data, 'Newsletter subscription active.');
});

export const confirmNewsletterSubscription = catchAsync(async (req, res) => {
  const data = await newsletterService.confirm(req.body.token);
  sendResponse(res, 200, data, 'Newsletter subscription confirmed');
});
