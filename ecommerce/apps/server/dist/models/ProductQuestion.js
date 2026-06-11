import { Schema, model } from 'mongoose';
const productQuestionSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    customerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    question: { type: String, required: true, trim: true, maxlength: 1500 },
    answer: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'answered'], default: 'pending', index: true },
    answeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    answeredAt: { type: Date, default: null }
}, { timestamps: true });
productQuestionSchema.index({ product: 1, status: 1, createdAt: -1 });
productQuestionSchema.index({ status: 1, createdAt: -1 });
export const ProductQuestion = model('ProductQuestion', productQuestionSchema);
