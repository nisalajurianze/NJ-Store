import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { Product } from '../models/Product.js';
import { ProductQuestion } from '../models/ProductQuestion.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { emailService } from './emailService.js';
import { notificationService } from './notificationService.js';
import { siteConfigService } from './siteConfigService.js';
import { socketService } from './socketService.js';
const toPublicQuestionDto = (question) => ({
    id: question._id.toString(),
    product: question.product._id.toString(),
    productName: question.product.name,
    productSlug: question.product.slug,
    question: question.question,
    answer: question.answer ?? '',
    askedBy: { name: question.customerName },
    answeredBy: question.answeredBy?.name
        ? {
            id: question.answeredBy._id?.toString(),
            name: question.answeredBy.name
        }
        : undefined,
    createdAt: question.createdAt.toISOString(),
    answeredAt: question.answeredAt?.toISOString()
});
const toAdminQuestionDto = (question) => ({
    id: question._id.toString(),
    product: {
        id: question.product._id.toString(),
        name: question.product.name,
        slug: question.product.slug
    },
    customer: {
        id: question.user?._id?.toString(),
        name: question.customerName,
        email: question.customerEmail
    },
    question: question.question,
    answer: question.answer ?? undefined,
    status: question.status,
    createdAt: question.createdAt.toISOString(),
    answeredAt: question.answeredAt?.toISOString(),
    answeredBy: question.answeredBy?.name
        ? {
            id: question.answeredBy._id?.toString(),
            name: question.answeredBy.name ?? undefined,
            email: question.answeredBy.email ?? undefined
        }
        : undefined
});
const buildProductUrl = (slug) => `${env.CLIENT_URL.replace(/\/+$/, '')}/product/${slug}`;
const buildAdminQuestionsUrl = () => `${env.ADMIN_URL.replace(/\/+$/, '')}/dashboard/product-questions?status=pending`;
const notifyStoreAboutQuestion = async (payload) => {
    try {
        const config = await siteConfigService.getOrCreateDocument();
        const recipient = config.footer?.email || env.EMAIL_FROM;
        if (!recipient) {
            return;
        }
        await emailService.sendProductQuestionReceived({
            to: recipient,
            productName: payload.productName,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            question: payload.question,
            adminUrl: buildAdminQuestionsUrl()
        });
    }
    catch (error) {
        logger.warn(`product_question.store_email_failed reason=${error instanceof Error ? error.message : 'unknown'}`);
    }
};
const notifyCustomerAboutAnswer = async (payload) => {
    const productUrl = buildProductUrl(payload.productSlug);
    try {
        await emailService.sendProductQuestionAnswered({
            to: payload.customerEmail,
            customerName: payload.customerName,
            productName: payload.productName,
            question: payload.question,
            answer: payload.answer,
            productUrl
        });
    }
    catch (error) {
        logger.warn(`product_question.customer_email_failed email=${payload.customerEmail} reason=${error instanceof Error ? error.message : 'unknown'}`);
    }
    if (!payload.userId) {
        return;
    }
    try {
        const notification = await notificationService.create({
            userId: payload.userId,
            type: 'product_question_answered',
            title: 'Product question answered',
            body: `We answered your question about ${payload.productName}.`,
            link: `/product/${payload.productSlug}`
        });
        socketService.emitToUser(payload.userId, 'notification_created', {
            type: notification.type,
            title: notification.title,
            body: notification.body,
            link: notification.link
        });
    }
    catch (error) {
        logger.warn(`product_question.customer_notification_failed reason=${error instanceof Error ? error.message : 'unknown'}`);
    }
};
export const productQuestionService = {
    listPublicQuestions: async (productId) => {
        const questions = await ProductQuestion.find({
            product: productId,
            status: 'answered'
        })
            .sort({ answeredAt: -1, createdAt: -1 })
            .populate('product', 'name slug')
            .populate('answeredBy', 'name')
            .lean();
        return questions.map((question) => toPublicQuestionDto(question));
    },
    createQuestion: async (payload) => {
        const product = await Product.findById(payload.productId)
            .select('name slug isActive')
            .lean();
        if (!product || !product.isActive) {
            throw new AppError('Product not found', 404);
        }
        const customerName = payload.user?.name?.trim() || payload.customerName?.trim();
        const customerEmail = payload.user?.email?.trim().toLowerCase() || payload.customerEmail?.trim().toLowerCase();
        if (!customerName || !customerEmail) {
            throw new AppError('Customer details are required.', 400);
        }
        const created = await ProductQuestion.create({
            product: product._id,
            user: payload.user?.id ? new Types.ObjectId(payload.user.id) : null,
            customerName,
            customerEmail,
            question: payload.question.trim()
        });
        socketService.emitToAdmin('product_question_created', {
            id: created._id.toString(),
            productId: product._id.toString(),
            productName: product.name,
            customerName,
            question: created.question,
            createdAt: created.createdAt.toISOString()
        });
        void notifyStoreAboutQuestion({
            productName: product.name,
            customerName,
            customerEmail,
            question: created.question
        });
        return {
            id: created._id.toString(),
            status: 'pending'
        };
    },
    listAdminQuestions: async (query) => {
        const filter = {};
        if (query?.status) {
            filter.status = query.status;
        }
        if (query?.search?.trim()) {
            const pattern = query.search.trim();
            filter.$or = [
                { question: { $regex: pattern, $options: 'i' } },
                { answer: { $regex: pattern, $options: 'i' } },
                { customerName: { $regex: pattern, $options: 'i' } },
                { customerEmail: { $regex: pattern, $options: 'i' } }
            ];
        }
        const questions = await ProductQuestion.find(filter)
            .sort({ status: 1, createdAt: -1 })
            .populate('product', 'name slug')
            .populate('user', '_id')
            .populate('answeredBy', 'name email')
            .lean();
        return questions.map((question) => toAdminQuestionDto(question));
    },
    answerQuestion: async (questionId, payload, adminUser) => {
        const updated = await ProductQuestion.findByIdAndUpdate(questionId, {
            answer: payload.answer.trim(),
            status: 'answered',
            answeredBy: new Types.ObjectId(adminUser.id),
            answeredAt: new Date()
        }, { new: true })
            .populate('product', 'name slug')
            .populate('user', '_id')
            .populate('answeredBy', 'name email')
            .lean();
        if (!updated) {
            throw new AppError('Question not found', 404);
        }
        void notifyCustomerAboutAnswer({
            userId: updated.user?._id?.toString(),
            customerName: updated.customerName,
            customerEmail: updated.customerEmail,
            productName: updated.product.name,
            productSlug: updated.product.slug,
            question: updated.question,
            answer: updated.answer ?? payload.answer.trim()
        });
        return toAdminQuestionDto(updated);
    }
};
