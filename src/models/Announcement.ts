import { Schema, model, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  message: string;
  isActive: boolean;
  createdAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>({
  message: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Announcement = model<IAnnouncement>('Announcement', announcementSchema);