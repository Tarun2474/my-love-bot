import { Schema, model, Document } from 'mongoose';

export interface IMatch extends Document {
  matchId: string;
  user1: number;
  user2: number;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  status: 'active' | 'ended' | 'cancelled';
  endedBy?: number;
}

const MatchSchema = new Schema<IMatch>({
  matchId: { type: String, required: true, unique: true },
  user1: { type: Number, required: true, index: true },
  user2: { type: Number, required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'ended', 'cancelled'], default: 'active', index: true },
  endedBy: { type: Number },
}, { timestamps: true });

export const Match = model<IMatch>('Match', MatchSchema);
