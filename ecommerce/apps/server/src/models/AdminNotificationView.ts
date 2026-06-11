import { type InferSchemaType, Schema, model } from 'mongoose';

const adminNotificationViewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notificationId: { type: String, required: true, trim: true },
    fingerprint: { type: String, required: true, trim: true },
    viewedAt: { type: Date, required: true, default: Date.now }
  },
  {
    timestamps: true
  }
);

adminNotificationViewSchema.index({ user: 1, notificationId: 1 }, { unique: true });
adminNotificationViewSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export type AdminNotificationViewDocument = InferSchemaType<typeof adminNotificationViewSchema>;
export const AdminNotificationView = model<AdminNotificationViewDocument>('AdminNotificationView', adminNotificationViewSchema);
