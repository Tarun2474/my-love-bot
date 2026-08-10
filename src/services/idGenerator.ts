import { Counter } from '../models/Counter';

export const generateMyLoveId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  
  const counter = await Counter.findOneAndUpdate(
    { name: 'myLoveUser' },
    { $inc: { sequenceNumber: 1 } },
    { new: true, upsert: true }
  );

  const seqNum = counter.sequenceNumber.toString().padStart(3, '0');
  return `MLB${currentYear}${seqNum}`;
};
