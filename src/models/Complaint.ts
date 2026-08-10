import { Schema, model, Document } from 'mongoose';

export interface IComplaint extends Document {
  userId: number;
  username?: string;

  myUserIdInput: string;
  reportedUserId: string;

  complaintType: string;
  issueDescription: string;

  hasProof: boolean;
  proofFileId?: string;
  proofType?: 'photo' | 'document';

  createdAt: Date;
}

const complaintSchema = new Schema<IComplaint>({
  userId: {
    type: Number,
    required: true
  },

  username: {
    type: String
  },

  myUserIdInput: {
    type: String,
    required: true
  },

  reportedUserId: {
    type: String,
    required: true
  },

  complaintType: {
    type: String,
    required: true
  },

  issueDescription: {
    type: String,
    required: true
  },

  hasProof: {
    type: Boolean,
    default: false
  },

  proofFileId: {
    type: String
  },

  proofType: {
    type: String,
    enum: ['photo', 'document']
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800
  }
});

export const Complaint = model<IComplaint>('Complaint', complaintSchema);