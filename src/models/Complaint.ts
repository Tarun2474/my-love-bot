import { Schema, model, Document } from 'mongoose';

export interface IComplaint extends Document {
  userId: number;
  username?: string;
  reportedUserId?: string;
  issueDescription: string;
  hasProof: boolean;
  createdAt: Date;
}

const complaintSchema = new Schema<IComplaint>({
  userId: { type: Number, required: true },
  username: { type: String },
  reportedUserId: { type: String },
  issueDescription: { type: String, required: true },
  hasProof: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 604800 } // 7 days in seconds (7 * 24 * 60 * 60)
});

export const Complaint = model<IComplaint>('Complaint', complaintSchema);