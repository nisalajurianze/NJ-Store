import { Schema, model, type InferSchemaType } from 'mongoose';

const newsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    source: { type: String, trim: true, default: 'storefront' },
    isConfirmed: { type: Boolean, default: false, index: true },
    confirmationToken: { type: String, select: false },
    confirmationExpires: { type: Date, select: false },
    confirmedAt: { type: Date }
  },
  { timestamps: true }
);

export type NewsletterSubscriberDocument = InferSchemaType<typeof newsletterSubscriberSchema>;
export const NewsletterSubscriber = model<NewsletterSubscriberDocument>('NewsletterSubscriber', newsletterSubscriberSchema);
