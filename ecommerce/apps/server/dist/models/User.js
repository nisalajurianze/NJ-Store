import bcrypt from 'bcryptjs';
import { adminPermissions, staffDefaultPermissions } from '@njstore/types';
import { Schema, model } from 'mongoose';
import { addressSchema, imageSchema } from './shared.js';
export const ALL_PERMISSIONS = [...adminPermissions];
export const STAFF_DEFAULT_PERMISSIONS = [...staffDefaultPermissions];
const shopFilterParamsSchema = new Schema({
    q: { type: String, trim: true },
    category: { type: String, trim: true },
    brand: { type: String, trim: true },
    minPrice: { type: String, trim: true },
    maxPrice: { type: String, trim: true },
    rating: { type: String, trim: true },
    inStock: { type: String, trim: true },
    bestSeller: { type: String, trim: true },
    sort: { type: String, trim: true }
}, { _id: false });
const shopFilterPresetSchema = new Schema({
    params: { type: shopFilterParamsSchema, default: {} },
    savedAt: { type: Date }
}, { _id: false });
const shopPreferencesSchema = new Schema({
    myFilters: { type: shopFilterPresetSchema }
}, { _id: false });
const userSchema = new Schema({
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer', index: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, trim: true, index: true, sparse: true },
    phone: { type: String, trim: true },
    avatar: { type: imageSchema },
    language: { type: String, enum: ['en', 'si'], default: 'en' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetUsedAt: { type: Date, select: false },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product', index: true }],
    recentlyViewed: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    addresses: {
        type: [addressSchema],
        validate: {
            validator: (addresses) => addresses.length <= 5,
            message: 'You can store up to 5 addresses'
        },
        default: []
    },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    otp: {
        secret: { type: String, select: false },
        otpauthUrl: { type: String, select: false },
        enabled: { type: Boolean, default: false }
    },
    shopPreferences: { type: shopPreferencesSchema, default: {} },
    permissions: { type: [String], default: [] },
    passwordChangedAt: { type: Date, select: false }
}, {
    timestamps: true,
    toJSON: {
        transform: (_doc, ret) => {
            ret.password = undefined;
            ret.emailVerificationToken = undefined;
            ret.emailVerificationExpires = undefined;
            ret.passwordResetToken = undefined;
            ret.passwordResetExpires = undefined;
            ret.passwordResetUsedAt = undefined;
            ret.loginAttempts = undefined;
            ret.lockUntil = undefined;
            ret.passwordChangedAt = undefined;
            ret.otp = undefined;
            ret.__v = undefined;
            return ret;
        }
    }
});
userSchema.pre('save', async function userPreSave(next) {
    if (this.role === 'customer') {
        this.permissions = [];
    }
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = new Date();
    next();
});
userSchema.methods.correctPassword = async function correctPassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};
userSchema.methods.isLocked = function isLocked() {
    return Boolean(this.lockUntil && this.lockUntil > new Date());
};
export const User = model('User', userSchema);
