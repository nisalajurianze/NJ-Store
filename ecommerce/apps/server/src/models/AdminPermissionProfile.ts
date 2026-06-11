import type { AdminPermission } from '@njstore/types';
import { Schema, model, type InferSchemaType } from 'mongoose';

const adminPermissionProfileSchema = new Schema(
  {
    role: { type: String, enum: ['staff', 'admin'], required: true, unique: true, index: true },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

export type AdminPermissionProfileSchemaType = Omit<InferSchemaType<typeof adminPermissionProfileSchema>, 'permissions'> & {
  permissions: AdminPermission[];
};

export const AdminPermissionProfile = model<AdminPermissionProfileSchemaType>('AdminPermissionProfile', adminPermissionProfileSchema);
