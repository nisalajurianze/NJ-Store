import { Schema, model } from 'mongoose';
const refreshSessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
    userAgent: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    rememberMe: { type: Boolean, default: false }
}, { timestamps: true });
refreshSessionSchema.index({ user: 1, revokedAt: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ sessionId: 1, revokedAt: 1, expiresAt: 1 });
export const RefreshSession = model('RefreshSession', refreshSessionSchema);
