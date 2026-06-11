import { Schema, model, type InferSchemaType } from 'mongoose';

const storeSettingVersionSchema = new Schema(
  {
    setting: { type: Schema.Types.ObjectId, ref: 'StoreSetting', required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    changeKeys: { type: [String], default: [] },
    snapshot: { type: Schema.Types.Mixed, required: true }
  },
  {
    timestamps: true
  }
);

storeSettingVersionSchema.index({ setting: 1, version: -1 }, { unique: true });

export type StoreSettingVersionDocument = InferSchemaType<typeof storeSettingVersionSchema>;
export const StoreSettingVersion = model<StoreSettingVersionDocument>('StoreSettingVersion', storeSettingVersionSchema);
