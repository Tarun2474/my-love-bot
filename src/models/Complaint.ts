import { Schema, model, Document } from 'mongoose';

export interface IComplaint extends Document {
  userId: number;
  username?: string;
  reportedUserId?: string;
  issueDescription: string;
  hasProof: boolean;
  proofFileId?: string;
  createdAt: Date;
}

const complaintSchema = new Schema<IComplaint>({
  userId: { type: Number, required: true },
  username: { type: String },
  reportedUserId: { type: String },
  issueDescription: { type: String, required: true },
  hasProof: { type: Boolean, default: false },
  proofFileId: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800
  }
});

export const Complaint = model<IComplaint>('Complaint', complaintSchema);