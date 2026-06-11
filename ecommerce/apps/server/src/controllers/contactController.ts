import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { sendEmail } from '../services/emailService.js';
import { env } from '../config/env.js';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const isEmailAddress = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const resolveContactRecipient = (): string => {
  const candidates = [env.SUPPORT_EMAIL, env.EMAIL_FROM, env.SMTP_USER];
  return candidates.find((candidate) => candidate && isEmailAddress(candidate)) ?? 'support@njstore.local';
};

export const sendContactMessage = catchAsync(async (req, res) => {
  if (typeof req.body.website === 'string' && req.body.website.trim()) {
    sendResponse(res, 200, undefined, 'Message sent successfully');
    return;
  }

  await sendEmail({
    to: resolveContactRecipient(),
    subject: `${env.APP_NAME} contact enquiry from ${req.body.name}`,
    html: `
      <p><strong>Name:</strong> ${escapeHtml(req.body.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(req.body.email)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(req.body.message).replace(/\n/g, '<br />')}</p>
    `
  });
  sendResponse(res, 200, undefined, 'Message sent successfully');
});
