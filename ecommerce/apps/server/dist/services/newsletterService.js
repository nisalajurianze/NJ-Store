import crypto from 'node:crypto';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { AppError } from '../utils/AppError.js';
import { emailService } from './emailService.js';
const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
const serializeNewsletterSubscriber = (subscriber) => ({
    id: subscriber._id.toString(),
    email: subscriber.email,
    source: subscriber.source ?? undefined,
    isConfirmed: subscriber.isConfirmed,
    confirmedAt: subscriber.confirmedAt?.toISOString(),
    createdAt: subscriber.createdAt?.toISOString()
});
export const newsletterService = {
    subscribe: async (payload) => {
        const email = payload.email.trim().toLowerCase();
        const existing = await NewsletterSubscriber.findOne({ email }).select('+confirmationToken +confirmationExpires');
        if (existing?.isConfirmed) {
            return serializeNewsletterSubscriber(existing);
        }
        const subscriber = existing ??
            new NewsletterSubscriber({
                email,
                source: payload.source?.trim() || 'storefront'
            });
        subscriber.source = payload.source?.trim() || subscriber.source || 'storefront';
        subscriber.isConfirmed = true;
        subscriber.confirmationToken = undefined;
        subscriber.confirmationExpires = undefined;
        subscriber.confirmedAt = subscriber.confirmedAt ?? new Date();
        await subscriber.save();
        await emailService.sendNewsletterWelcome(email);
        return serializeNewsletterSubscriber(subscriber);
    },
    confirm: async (token) => {
        const hashedToken = hashToken(token.trim());
        const subscriber = await NewsletterSubscriber.findOne({
            confirmationToken: hashedToken,
            confirmationExpires: { $gt: new Date() }
        }).select('+confirmationToken +confirmationExpires');
        if (!subscriber) {
            throw new AppError('This newsletter confirmation link is invalid or expired.', 400);
        }
        subscriber.isConfirmed = true;
        subscriber.confirmedAt = new Date();
        subscriber.confirmationToken = undefined;
        subscriber.confirmationExpires = undefined;
        await subscriber.save();
        await emailService.sendNewsletterWelcome(subscriber.email);
        return serializeNewsletterSubscriber(subscriber);
    }
};
