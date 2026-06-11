import { Schema, model, type InferSchemaType } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actorUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String, trim: true, lowercase: true, index: true },
    actorRole: { type: String, enum: ['customer', 'staff', 'admin', 'system'], default: 'system', index: true },
    action: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, trim: true, index: true },
    targetId: { type: String, trim: true, index: true },
    targetLabel: { type: String, trim: true },
    status: { type: String, enum: ['success', 'failure', 'blocked'], default: 'success', index: true },
    message: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1, action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = model<AuditLogDocument>('AuditLog', auditLogSchema);
