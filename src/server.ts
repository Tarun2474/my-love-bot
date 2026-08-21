import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { app, bot } from './app';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    // Start Express Server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} 🚀`);
    });

    // Delete any existing webhook and handle launch safely
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    } catch (e) {
      console.log('Webhook clear notice:', e);
    }

    // Start Bot with safe error handling
    await bot.launch({
      dropPendingUpdates: true
    });
    
    console.log('Telegram Bot successfully launched in Polling mode 🤖❤️');

  } catch (error: any) {
    console.error('Failed to start server or bot:', error);
    // Agar conflict error aaye toh 5 second baad process restart ho jayega
    if (error?.description?.includes('Conflict')) {
      console.log('Conflict detected. Restarting process in 5 seconds...');
      setTimeout(() => process.exit(1), 5000);
    } else {
      process.exit(1);
    }
  }
};

startServer();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));