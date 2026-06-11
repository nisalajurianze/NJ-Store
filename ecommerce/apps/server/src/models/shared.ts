import { Schema } from 'mongoose';

export const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String }
  },
  { _id: false }
);

export const addressSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'Sri Lanka', trim: true },
    isDefault: { type: Boolean, default: false }
  },
  { _id: true }
);
