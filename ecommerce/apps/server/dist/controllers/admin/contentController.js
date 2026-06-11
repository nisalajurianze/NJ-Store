import { auditLogService } from '../../services/auditLogService.js';
import { productQuestionService } from '../../services/productQuestionService.js';
import { reviewService } from '../../services/reviewService.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { requestAudit, routeId } from './helpers.js';
export const listReviews = catchAsync(async (_req, res) => {
    const data = await reviewService.listPendingReviews();
    sendResponse(res, 200, data);
});
export const moderateReview = catchAsync(async (req, res) => {
    const data = await reviewService.moderateReview(routeId(req), req.body.isApproved);
    await auditLogService.record({
        action: 'admin.review.moderate',
        targetType: 'review',
        targetId: data.id,
        targetLabel: data.title,
        message: req.body.isApproved ? 'Review approved by admin' : 'Review rejected by admin',
        metadata: { isApproved: req.body.isApproved },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Review updated');
});
export const replyToReview = catchAsync(async (req, res) => {
    const data = await reviewService.replyToReview(routeId(req), req.body.adminReply);
    await auditLogService.record({
        action: 'admin.review.reply',
        targetType: 'review',
        targetId: data.id,
        targetLabel: data.title,
        message: 'Admin replied to a review',
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Reply saved');
});
export const listProductQuestions = catchAsync(async (req, res) => {
    const data = await productQuestionService.listAdminQuestions({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined
    });
    sendResponse(res, 200, data);
});
export const answerProductQuestion = catchAsync(async (req, res) => {
    const data = await productQuestionService.answerQuestion(routeId(req), { answer: req.body.answer }, {
        id: req.user.id,
        name: req.user.email,
        email: req.user.email
    });
    await auditLogService.record({
        action: 'admin.product_question.answer',
        targetType: 'product_question',
        targetId: data.id,
        targetLabel: data.product.name,
        message: 'Product question answered by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Question answered');
});
