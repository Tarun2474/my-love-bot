import { Schema, model, Document } from 'mongoose';

export interface ICounter extends Document {
  name: string;
  sequenceNumber: number;
}

const CounterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  sequenceNumber: { type: Number, required: true, default: 0 },
});

export const Counter = model<ICounter>('Counter', CounterSchema);
