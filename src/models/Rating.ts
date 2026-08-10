import { Schema, model, Document } from 'mongoose';

export interface IRating extends Document {
  matchId: string;
  fromUser: number;
  toUser: number;
  rating: 'like' | 'dislike';
}

const ratingSchema = new Schema<IRating>({
  matchId: { type: String, required: true },
  fromUser: { type: Number, required: true },
  toUser: { type: Number, required: true },
  rating: { type: String, enum: ['like', 'dislike'], required: true }
}, { timestamps: true });

ratingSchema.index({ matchId: 1, fromUser: 1 }, { unique: true });

export const Rating = model<IRating>('Rating', ratingSchema);
