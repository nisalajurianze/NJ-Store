import { Schema, model } from 'mongoose';
const compareListSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String },
    items: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        validate: {
            validator: (items) => items.length <= 4,
            message: 'Compare list supports up to 4 items'
        },
        default: []
    }
}, { timestamps: true });
compareListSchema.index({ user: 1 }, { unique: true, sparse: true });
compareListSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
export const CompareList = model('CompareList', compareListSchema);
