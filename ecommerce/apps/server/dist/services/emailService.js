import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { renderAbandonedCartRecoveryEmail, renderAdminBroadcastEmail, renderBackInStockEmail, renderLowStockEmail, renderNewsletterConfirmationEmail, renderNewsletterWelcomeEmail, renderOrderConfirmationEmail, renderOrderShippedEmail, renderPasswordResetEmail, renderProductQuestionAnsweredEmail, renderProductQuestionReceivedEmail, renderQuotationEmail, renderReceiptRejectedEmail, renderVerificationEmail } from '../templates/emailTemplates.js';
const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_DELIVERY_TIMEOUT_MS = 10_000;
const RESEND_HOST = 'smtp.resend.com';
const smtpPassword = env.SMTP_PASS || env.RESEND_API_KEY;
const resendApiKey = env.RESEND_API_KEY || (env.SMTP_HOST === RESEND_HOST ? env.SMTP_PASS : '');
const hasResendApiCredentials = Boolean(resendApiKey);
const hasSmtpCredentials = !hasResendApiCredentials && Boolean(env.SMTP_USER && smtpPassword);
const isEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withTimeout = async (operation) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EMAIL_DELIVERY_TIMEOUT_MS);
    timer.unref();
    try {
        return await operation(controller.signal);
    }
    finally {
        clearTimeout(timer);
    }
};
const parseResendError = (body) => {
    if (!body || typeof body !== 'object') {
        return 'unknown_error';
    }
    const error = 'error' in body ? body.error : body;
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    if ('message' in body && typeof body.message === 'string') {
        return body.message;
    }
    return 'unknown_error';
};
const parseJsonBody = (rawBody) => {
    if (!rawBody) {
        return {};
    }
    try {
        return JSON.parse(rawBody);
    }
    catch {
        return { message: rawBody };
    }
};
const sendWithRetry = async (operation, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            logger.warn(`Email send attempt ${attempt}/${maxRetries} failed, retrying in ${Math.pow(2, attempt)}s`);
            await delay(Math.pow(2, attempt) * 1000);
        }
    }
    throw new Error('Email delivery failed');
};
const sendMailWithRetry = async (mailOptions) => sendWithRetry(() => transporter.sendMail(mailOptions));
const sendResendApiWithRetry = async (mailOptions) => {
    const responseBody = await sendWithRetry(async () => withTimeout(async (signal) => {
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
        return parsedBody;
    }));
    logger.info(`email.sent provider=resend_api to=${mailOptions.to} id=${responseBody.id ?? 'unknown'}`);
    return responseBody;
};
/**
 * Sends an email using the configured transport or logs a JSON preview in development.
 */
export const sendEmail = async ({ html, subject, to }) => {
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
    sendVerification: (name, email, verificationUrl) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} email verification`,
        html: renderVerificationEmail(name, verificationUrl)
    }),
    sendPasswordReset: (name, email, resetUrl) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} password reset`,
        html: renderPasswordResetEmail(name, resetUrl)
    }),
    sendQuotation: (name, email, quotationUrl, pdfUrl, expiryDate) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} quotation ready`,
        html: renderQuotationEmail(name, quotationUrl, pdfUrl, expiryDate)
    }),
    sendOrderConfirmation: (name, email, orderNumber) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} order confirmed`,
        html: renderOrderConfirmationEmail(name, orderNumber)
    }),
    sendOrderShipped: (name, email, orderNumber, trackingNumber, orderUrl) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} order shipped`,
        html: renderOrderShippedEmail(name, orderNumber, trackingNumber, orderUrl)
    }),
    sendReceiptRejected: (name, email, orderNumber, reason) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} receipt rejected`,
        html: renderReceiptRejectedEmail(name, orderNumber, reason)
    }),
    sendLowStockAlert: (email, productName, sku, stock) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} low stock alert`,
        html: renderLowStockEmail(productName, sku, stock)
    }),
    sendBackInStock: (name, email, productName, productUrl, variantLabel) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} back in stock`,
        html: renderBackInStockEmail(name, productName, productUrl, variantLabel)
    }),
    sendProductQuestionReceived: (payload) => sendEmail({
        to: payload.to,
        subject: `${env.APP_NAME} product question`,
        html: renderProductQuestionReceivedEmail(payload)
    }),
    sendProductQuestionAnswered: (payload) => sendEmail({
        to: payload.to,
        subject: `${env.APP_NAME} answered your product question`,
        html: renderProductQuestionAnsweredEmail(payload)
    }),
    sendAbandonedCartRecovery: (payload) => sendEmail({
        to: payload.email,
        subject: `${env.APP_NAME} cart reminder`,
        html: renderAbandonedCartRecoveryEmail(payload)
    }),
    sendNewsletterConfirmation: (email, confirmationUrl) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} newsletter confirmation`,
        html: renderNewsletterConfirmationEmail(confirmationUrl)
    }),
    sendNewsletterWelcome: (email) => sendEmail({
        to: email,
        subject: `${env.APP_NAME} newsletter confirmed`,
        html: renderNewsletterWelcomeEmail()
    }),
    sendAdminBroadcast: ({ to, subject, previewText, headline, body, ctaLabel, ctaUrl, audienceLabel }) => sendEmail({
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
