import mongoose from 'mongoose';
import dns from 'dns';

// Fix for MongoDB DNS lookup issues on certain networks/Wi-Fi
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (error) {
  console.error('Failed to set custom DNS servers:', error);
}

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected Successfully! 🍃');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};