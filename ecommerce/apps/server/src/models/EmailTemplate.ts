import { Schema, model, type InferSchemaType } from 'mongoose';

const emailTemplateSchema = new Schema(
  {
    type: { type: String, required: true, trim: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true },
    bodyHtml: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

emailTemplateSchema.index({ sortOrder: 1, type: 1 });

export type EmailTemplateDocument = InferSchemaType<typeof emailTemplateSchema>;
export const EmailTemplate = model<EmailTemplateDocument>('EmailTemplate', emailTemplateSchema);
