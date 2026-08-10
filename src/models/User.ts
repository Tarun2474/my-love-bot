import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  telegramUserId: number;
  myLoveId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  filterGender?: 'Male' | 'Female' | 'Other' | 'All';
  country: string;
  isAdult: boolean;
  likes: number;
  dislikes: number;
  level: number;
  totalChatSeconds: number;
  status: 'NEW' | 'REGISTERING' | 'ACTIVE' | 'SEARCHING' | 'CHATTING' | 'RATING' | 'INACTIVE' | 'DELETED';
  isSearching: boolean;
  partnerId?: number;
  activeMatchId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

const UserSchema = new Schema<IUser>({
  telegramUserId: { type: Number, required: true, unique: true, index: true },
  myLoveId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  age: { type: Number, required: true, min: 18 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true, index: true },
  filterGender: { type: String, enum: ['Male', 'Female', 'Other', 'All'], default: 'All' },
  country: { type: String, required: true },
  isAdult: { type: Boolean, required: true, default: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  totalChatSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['NEW', 'REGISTERING', 'ACTIVE', 'SEARCHING', 'CHATTING', 'RATING', 'INACTIVE', 'DELETED'], default: 'NEW', index: true },
  isSearching: { type: Boolean, default: false, index: true },
  partnerId: { type: Number },
  activeMatchId: { type: String },
  lastActiveAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

export const User = model<IUser>('User', UserSchema);