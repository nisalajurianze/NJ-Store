import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface SmsPayload {
  to: string;
  body: string;
}

const hasTwilioCredentials = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
const twilioHttpClient = axios.create({ timeout: 10_000 });

const normalizePhoneNumber = (value: string | undefined | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D+/g, '');
  if (!digits) {
    return null;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+94${digits.slice(1)}`;
  }

  if (digits.startsWith('94')) {
    return `+${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
};

const sendSms = async ({ body, to }: SmsPayload): Promise<void> => {
  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo) {
    return;
  }

  if (!hasTwilioCredentials) {
    logger.info(`SMS preview generated for ${normalizedTo}`);
    return;
  }

  const payload = new URLSearchParams({
    To: normalizedTo,
    From: env.TWILIO_FROM_NUMBER,
    Body: body
  });

  try {
    await twilioHttpClient.post(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      payload.toString(),
      {
        auth: {
          username: env.TWILIO_ACCOUNT_SID,
          password: env.TWILIO_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  } catch (error) {
    const isAxiosError = axios.isAxiosError(error);
    const message = error instanceof Error ? error.message : 'unknown error';
    const status = isAxiosError ? error.response?.status : undefined;
    const details = isAxiosError ? error.response?.data : undefined;

    logger.error('SMS delivery failed', {
      to: normalizedTo,
      error: message,
      ...(status ? { status } : {}),
      ...(details ? { details } : {})
    });
    
    throw new Error(`SMS delivery failed: ${message}`);
  }
};

export const smsService = {
  sendQuotationReady: (phone: string, quotationNumber: string, quotationUrl: string) =>
    sendSms({
      to: phone,
      body: `${env.APP_NAME}: Your quotation ${quotationNumber} is ready. Review it at ${quotationUrl}`
    }),
  sendOrderConfirmation: (phone: string, orderNumber: string) =>
    sendSms({
      to: phone,
      body: `${env.APP_NAME}: Your order ${orderNumber} has been confirmed.`
    }),
  sendOrderShipped: (phone: string, orderNumber: string, trackingNumber: string, orderUrl: string) =>
    sendSms({
      to: phone,
      body: `${env.APP_NAME}: Order ${orderNumber} has shipped. Tracking: ${trackingNumber}. Details: ${orderUrl}`
    }),
  sendReceiptRejected: (phone: string, orderNumber: string, reason: string) =>
    sendSms({
      to: phone,
      body: `${env.APP_NAME}: The receipt for ${orderNumber} was rejected. Reason: ${reason}`
    }),
  sendLowStockAlert: (phone: string, productName: string, sku: string, stock: number) =>
    sendSms({
      to: phone,
      body: `${env.APP_NAME}: Low stock alert for ${productName} (${sku}). Remaining stock: ${stock}.`
    })
};
