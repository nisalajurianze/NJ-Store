import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  renderAbandonedCartRecoveryEmail,
  renderAdminBroadcastEmail,
  renderBackInStockEmail,
  renderLowStockEmail,
  renderNewsletterConfirmationEmail,
  renderNewsletterWelcomeEmail,
  renderOrderConfirmationEmail,
  renderOrderShippedEmail,
  renderPasswordResetEmail,
  renderProductQuestionAnsweredEmail,
  renderProductQuestionReceivedEmail,
  renderQuotationEmail,
  renderReceiptRejectedEmail,
  renderVerificationEmail
} from '../templates/emailTemplates.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_DELIVERY_TIMEOUT_MS = 10_000;
const RESEND_HOST = 'smtp.resend.com';

const smtpPassword = env.SMTP_PASS || env.RESEND_API_KEY;
const resendApiKey = env.RESEND_API_KEY || (env.SMTP_HOST === RESEND_HOST ? env.SMTP_PASS : '');
const hasResendApiCredentials = Boolean(resendApiKey);
const hasSmtpCredentials = !hasResendApiCredentials && Boolean(env.SMTP_USER && smtpPassword);
const isEmailAddress = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const smtpUserFromAddress = isEmailAddress(env.SMTP_USER) ? env.SMTP_USER : '';
const resolvedFromAddress = env.EMAIL_FROM || smtpUserFromAddress || (hasResendApiCredentials ? 'onboarding@resend.dev' : 'no-reply@njstore.local');
const resolvedFromName = env.EMAIL_FROM_NAME || env.APP_NAME;

if (!hasResendApiCredentials && !hasSmtpCredentials && env.NODE_ENV === 'production') {
  logger.error('Email credentials are not configured — emails will NOT be delivered in production');
}

if ((hasResendApiCredentials || hasSmtpCredentials) && !env.EMAIL_FROM && !smtpUserFromAddress) {
  logger.warn('EMAIL_FROM is not configured; set it to a verified sender address before sending real emails.');
}

const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      auth: {
        user: env.SMTP_USER,
        pass: smtpPassword
      }
    })
  : nodemailer.createTransport({ jsonTransport: true });

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_DELIVERY_TIMEOUT_MS);
  timer.unref();

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const parseResendError = (body: unknown): string => {
  if (!body || typeof body !== 'object') {
    return 'unknown_error';
  }

  const error = 'error' in body ? (body as { error?: unknown }).error : body;
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if ('message' in body && typeof (body as { message?: unknown }).message === 'string') {
    return (body as { message: string }).message;
  }

  return 'unknown_error';
};

const parseJsonBody = (rawBody: string): unknown => {
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { message: rawBody };
  }
};

const sendWithRetry = async <T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      logger.warn(`Email send attempt ${attempt}/${maxRetries} failed, retrying in ${Math.pow(2, attempt)}s`);
      await delay(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error('Email delivery failed');
};

const sendMailWithRetry = async (mailOptions: Parameters<typeof transporter.sendMail>[0]) => sendWithRetry(() => transporter.sendMail(mailOptions));

const sendResendApiWithRetry = async (mailOptions: { from: string; to: string; subject: string; html: string; text: string }) => {
  const responseBody = await sendWithRetry(async () =>
    withTimeout(async (signal) => {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mailOptions)
      });

      const rawBody = await response.text();
      const parsedBody = parseJsonBody(rawBody);

      if (!response.ok) {
        throw new Error(`Resend API email failed status=${response.status} message=${parseResendError(parsedBody)}`);
      }

      return parsedBody as { id?: string };
    })
  );

  logger.info(`email.sent provider=resend_api to=${mailOptions.to} id=${responseBody.id ?? 'unknown'}`);
  return responseBody;
};

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface AdminBroadcastEmailPayload {
  to: string;
  subject: string;
  previewText?: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  audienceLabel?: string;
}

/**
 * Sends an email using the configured transport or logs a JSON preview in development.
 */
export const sendEmail = async ({ html, subject, to }: EmailPayload): Promise<void> => {
  const mailOptions = {
    from: `"${resolvedFromName}" <${resolvedFromAddress}>`,
    to,
    subject,
    html,
    text: htmlToText(html)
  };

  if (hasResendApiCredentials) {
    await sendResendApiWithRetry(mailOptions);
    return;
  }

  const response = await sendMailWithRetry(mailOptions);

  if ('message' in response) {
    logger.info(`Email preview generated for ${to} from=${resolvedFromAddress}`);
  }
};

export const emailService = {
  sendVerification: (name: string, email: string, verificationUrl: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} email verification`,
      html: renderVerificationEmail(name, verificationUrl)
    }),
  sendPasswordReset: (name: string, email: string, resetUrl: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} password reset`,
      html: renderPasswordResetEmail(name, resetUrl)
    }),
  sendQuotation: (name: string, email: string, quotationUrl: string, pdfUrl: string, expiryDate: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} quotation ready`,
      html: renderQuotationEmail(name, quotationUrl, pdfUrl, expiryDate)
    }),
  sendOrderConfirmation: (name: string, email: string, orderNumber: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} order confirmed`,
      html: renderOrderConfirmationEmail(name, orderNumber)
    }),
  sendOrderShipped: (name: string, email: string, orderNumber: string, trackingNumber: string, orderUrl: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} order shipped`,
      html: renderOrderShippedEmail(name, orderNumber, trackingNumber, orderUrl)
    }),
  sendReceiptRejected: (name: string, email: string, orderNumber: string, reason: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} receipt rejected`,
      html: renderReceiptRejectedEmail(name, orderNumber, reason)
    }),
  sendLowStockAlert: (email: string, productName: string, sku: string, stock: number) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} low stock alert`,
      html: renderLowStockEmail(productName, sku, stock)
    }),
  sendBackInStock: (name: string, email: string, productName: string, productUrl: string, variantLabel?: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} back in stock`,
      html: renderBackInStockEmail(name, productName, productUrl, variantLabel)
    }),
  sendProductQuestionReceived: (payload: {
    to: string;
    productName: string;
    customerName: string;
    customerEmail: string;
    question: string;
    adminUrl: string;
  }) =>
    sendEmail({
      to: payload.to,
      subject: `${env.APP_NAME} product question`,
      html: renderProductQuestionReceivedEmail(payload)
    }),
  sendProductQuestionAnswered: (payload: {
    to: string;
    customerName: string;
    productName: string;
    question: string;
    answer: string;
    productUrl: string;
  }) =>
    sendEmail({
      to: payload.to,
      subject: `${env.APP_NAME} answered your product question`,
      html: renderProductQuestionAnsweredEmail(payload)
    }),
  sendAbandonedCartRecovery: (payload: {
    name: string;
    email: string;
    stageHours: number;
    cartUrl: string;
    items: Array<{ name: string; quantity: number; price: number }>;
  }) =>
    sendEmail({
      to: payload.email,
      subject: `${env.APP_NAME} cart reminder`,
      html: renderAbandonedCartRecoveryEmail(payload)
    }),
  sendNewsletterConfirmation: (email: string, confirmationUrl: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} newsletter confirmation`,
      html: renderNewsletterConfirmationEmail(confirmationUrl)
    }),
  sendNewsletterWelcome: (email: string) =>
    sendEmail({
      to: email,
      subject: `${env.APP_NAME} newsletter confirmed`,
      html: renderNewsletterWelcomeEmail()
    }),
  sendAdminBroadcast: ({ to, subject, previewText, headline, body, ctaLabel, ctaUrl, audienceLabel }: AdminBroadcastEmailPayload) =>
    sendEmail({
      to,
      subject,
      html: renderAdminBroadcastEmail({
        previewText,
        headline,
        body,
        ctaLabel,
        ctaUrl,
        audienceLabel
      })
    })
};
