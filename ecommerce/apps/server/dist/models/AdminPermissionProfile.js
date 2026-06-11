import { Schema, model } from 'mongoose';
const adminPermissionProfileSchema = new Schema({
    role: { type: String, enum: ['staff', 'admin'], required: true, unique: true, index: true },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true }
}, {
    timestamps: true
});
export const AdminPermissionProfile = model('AdminPermissionProfile', adminPermissionProfileSchema);
