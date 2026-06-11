import { Schema, model, type InferSchemaType } from 'mongoose';
import { addressSchema, imageSchema } from './shared.js';

export const ORDER_TIMELINE_LIMIT = 100;

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    image: { type: imageSchema },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    variantLabel: { type: String, trim: true },
    sku: { type: String, required: true, trim: true },
    variantIndex: { type: Number, min: 0 },
    bundleItems: {
      type: [
        new Schema(
          {
            product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            name: { type: String, required: true, trim: true },
            slug: { type: String, required: true, trim: true },
            image: { type: imageSchema },
            quantity: { type: Number, required: true, min: 1 },
            sku: { type: String, required: true, trim: true },
            variantIndex: { type: Number, min: 0 },
            variantLabel: { type: String, trim: true }
          },
          { _id: false }
        )
      ],
      default: []
    }
  },
  { _id: false }
);

const timelineSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      required: true
    },
    note: { type: String, required: true, trim: true },
    actor: { type: String, trim: true },
    createdAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const orderReceiptSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String },
    createdAt: { type: Date, required: true, default: Date.now }
  },
  { _id: true }
);

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    quotationNumber: { type: String, unique: true, sparse: true, index: true },
    quotationToken: { type: String, unique: true, sparse: true, index: true },
    quotationExpiry: { type: Date },
    isQuotation: { type: Boolean, default: false, index: true },
    fulfilmentConfigured: { type: Boolean, default: true },
    type: { type: String, enum: ['delivery', 'pickup'], required: true },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash_on_delivery'],
      default: 'bank_transfer'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'receipt_uploaded', 'paid', 'rejected'],
      default: 'unpaid',
      index: true
    },
    paidAt: { type: Date, index: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    taxLabel: { type: String, trim: true, default: 'VAT' },
    taxRate: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    shippingAddress: { type: addressSchema },
    pickupSlot: { type: String, trim: true },
    notes: { type: String, trim: true },
    deliveryNotes: { type: String, trim: true },
    couponCode: { type: String, trim: true, uppercase: true },
    items: { type: [orderItemSchema], required: true, default: [] },
    trackingNumber: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    receipt: { type: imageSchema },
    receipts: { type: [orderReceiptSchema], default: [] },
    quotationPdf: { type: imageSchema },
    invoicePdf: { type: imageSchema },
    receiptRejectionReason: { type: String, trim: true },
    internalNote: { type: String, trim: true, maxlength: 2000 },
    estimatedDeliveryDays: { type: String, trim: true },
    estimatedDeliveryDate: { type: Date },
    loyaltyPointsAwarded: { type: Number, default: 0, min: 0 },
    loyaltyPointsGranted: { type: Boolean, default: false },
    loyaltyPointsRedeemed: { type: Number, default: 0, min: 0 },
    loyaltyDiscount: { type: Number, default: 0, min: 0 },
    timeline: { type: [timelineSchema], default: [] },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, paidAt: -1 });
orderSchema.index({ isQuotation: 1, quotationExpiry: 1 });

orderSchema.pre('save', function orderPreSave(next) {
  if (this.isModified('timeline') && this.timeline.length > ORDER_TIMELINE_LIMIT) {
    this.timeline.splice(0, this.timeline.length - ORDER_TIMELINE_LIMIT);
  }

  next();
});

export type OrderDocument = InferSchemaType<typeof orderSchema>;
export const Order = model<OrderDocument>('Order', orderSchema);
