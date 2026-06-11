import bcrypt from 'bcryptjs';
import type { AdminPermission } from '@njstore/types';
import { adminPermissions, staffDefaultPermissions } from '@njstore/types';
import { type HydratedDocument, type InferSchemaType, type Model, type Types, Schema, model } from 'mongoose';
import { addressSchema, imageSchema } from './shared.js';

export const ALL_PERMISSIONS = [...adminPermissions];
export const STAFF_DEFAULT_PERMISSIONS = [...staffDefaultPermissions];

const shopFilterParamsSchema = new Schema(
  {
    q: { type: String, trim: true },
    category: { type: String, trim: true },
    brand: { type: String, trim: true },
    minPrice: { type: String, trim: true },
    maxPrice: { type: String, trim: true },
    rating: { type: String, trim: true },
    inStock: { type: String, trim: true },
    bestSeller: { type: String, trim: true },
    sort: { type: String, trim: true }
  },
  { _id: false }
);

const shopFilterPresetSchema = new Schema(
  {
    params: { type: shopFilterParamsSchema, default: {} },
    savedAt: { type: Date }
  },
  { _id: false }
);

const shopPreferencesSchema = new Schema(
  {
    myFilters: { type: shopFilterPresetSchema }
  },
  { _id: false }
);

type UserImage = InferSchemaType<typeof imageSchema>;
type UserAddress = InferSchemaType<typeof addressSchema> & { _id?: Types.ObjectId };
type UserShopPreferences = InferSchemaType<typeof shopPreferencesSchema>;

type UserSchemaFields = {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'staff' | 'admin';
  authProvider: 'local' | 'google';
  googleId?: string;
  phone?: string;
  avatar?: UserImage;
  language: 'en' | 'si';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetUsedAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  wishlist: Types.ObjectId[];
  recentlyViewed: Types.ObjectId[];
  addresses: UserAddress[];
  loyaltyPoints: number;
  isActive: boolean;
  otp: {
    secret?: string;
    otpauthUrl?: string;
    enabled: boolean;
  };
  shopPreferences: UserShopPreferences;
  permissions: AdminPermission[];
  passwordChangedAt?: Date;
};

type UserMethods = {
  correctPassword: (candidatePassword: string) => Promise<boolean>;
  isLocked: () => boolean;
};

type UserModel = Model<UserSchemaFields, {}, UserMethods>;

const userSchema = new Schema<UserSchemaFields, UserModel, UserMethods>(
  {
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
        validator: (addresses: InferSchemaType<typeof addressSchema>[]) => addresses.length <= 5,
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
  },
  {
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
  }
);

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

userSchema.methods.correctPassword = async function correctPassword(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password as string);
};

userSchema.methods.isLocked = function isLocked(): boolean {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

export type UserSchemaType = Omit<InferSchemaType<typeof userSchema>, 'permissions'> & {
  permissions: AdminPermission[];
};

export type UserDocument = HydratedDocument<UserSchemaType, UserMethods>;
export const User = model<UserSchemaType, UserModel>('User', userSchema);
