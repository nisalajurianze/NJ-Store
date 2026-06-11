import { Schema, model, type InferSchemaType } from 'mongoose';

const manualExpenseSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    incurredOn: { type: Date, required: true, index: true },
    category: { type: String, default: 'Operations', trim: true, index: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

manualExpenseSchema.index({ incurredOn: -1, createdAt: -1 });

export type ManualExpenseDocument = InferSchemaType<typeof manualExpenseSchema>;
export const ManualExpense = model<ManualExpenseDocument>('ManualExpense', manualExpenseSchema);
