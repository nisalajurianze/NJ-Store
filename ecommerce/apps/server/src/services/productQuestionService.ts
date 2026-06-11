import type { AdminProductQuestionDto, ProductQuestionDto } from '@njstore/types';
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

const toPublicQuestionDto = (question: {
  _id: Types.ObjectId | string;
  product: { _id: Types.ObjectId | string; name: string; slug: string };
  customerName: string;
  question: string;
  answer?: string | null;
  answeredBy?: { _id?: Types.ObjectId | string; name?: string | null } | null;
  createdAt: Date;
  answeredAt?: Date | null;
}): ProductQuestionDto => ({
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

const toAdminQuestionDto = (question: {
  _id: Types.ObjectId | string;
  product: { _id: Types.ObjectId | string; name: string; slug: string };
  user?: { _id: Types.ObjectId | string } | null;
  customerName: string;
  customerEmail: string;
  question: string;
  answer?: string | null;
  status: 'pending' | 'answered';
  createdAt: Date;
  answeredAt?: Date | null;
  answeredBy?: { _id?: Types.ObjectId | string; name?: string | null; email?: string | null } | null;
}): AdminProductQuestionDto => ({
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

type PublicQuestionShape = Parameters<typeof toPublicQuestionDto>[0];
type AdminQuestionShape = Parameters<typeof toAdminQuestionDto>[0];

const buildProductUrl = (slug: string): string => `${env.CLIENT_URL.replace(/\/+$/, '')}/product/${slug}`;
const buildAdminQuestionsUrl = (): string => `${env.ADMIN_URL.replace(/\/+$/, '')}/dashboard/product-questions?status=pending`;

const notifyStoreAboutQuestion = async (payload: {
  productName: string;
  customerName: string;
  customerEmail: string;
  question: string;
}): Promise<void> => {
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
  } catch (error) {
    logger.warn(`product_question.store_email_failed reason=${error instanceof Error ? error.message : 'unknown'}`);
  }
};

const notifyCustomerAboutAnswer = async (payload: {
  userId?: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  productSlug: string;
  question: string;
  answer: string;
}): Promise<void> => {
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
  } catch (error) {
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
  } catch (error) {
    logger.warn(`product_question.customer_notification_failed reason=${error instanceof Error ? error.message : 'unknown'}`);
  }
};

export const productQuestionService = {
  listPublicQuestions: async (productId: string): Promise<ProductQuestionDto[]> => {
    const questions = await ProductQuestion.find({
      product: productId,
      status: 'answered'
    })
      .sort({ answeredAt: -1, createdAt: -1 })
      .populate('product', 'name slug')
      .populate('answeredBy', 'name')
      .lean<PublicQuestionShape[]>();

    return questions.map((question) => toPublicQuestionDto(question));
  },

  createQuestion: async (payload: {
    productId: string;
    question: string;
    customerName?: string;
    customerEmail?: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }): Promise<{ id: string; status: 'pending' }> => {
    const product = await Product.findById(payload.productId)
      .select('name slug isActive')
      .lean<{ _id: Types.ObjectId; name: string; slug: string; isActive: boolean } | null>();

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

  listAdminQuestions: async (query?: {
    status?: 'pending' | 'answered';
    search?: string;
  }): Promise<AdminProductQuestionDto[]> => {
    const filter: Record<string, unknown> = {};

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
      .lean<AdminQuestionShape[]>();

    return questions.map((question) => toAdminQuestionDto(question));
  },

  answerQuestion: async (
    questionId: string,
    payload: {
      answer: string;
    },
    adminUser: {
      id: string;
      name: string;
      email: string;
    }
  ): Promise<AdminProductQuestionDto> => {
    const updated = await ProductQuestion.findByIdAndUpdate(
      questionId,
      {
        answer: payload.answer.trim(),
        status: 'answered',
        answeredBy: new Types.ObjectId(adminUser.id),
        answeredAt: new Date()
      },
      { new: true }
    )
      .populate('product', 'name slug')
      .populate('user', '_id')
      .populate('answeredBy', 'name email')
      .lean<AdminQuestionShape | null>();

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
