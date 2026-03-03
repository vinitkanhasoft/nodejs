import mongoose, { Schema, Document } from 'mongoose';

// Example of another model for demonstration
export interface IOtherModel extends Document {
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const otherModelSchema = new Schema<IOtherModel>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

export const OtherModel = mongoose.model<IOtherModel>('OtherModel', otherModelSchema);
