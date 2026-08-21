import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { app, bot } from './app';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    // Start Express Server (Render ke liye zaroori hai ki port bind ho)
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} 🚀`);
    });

    // 1. Purana webhook delete karo taaki conflict na aaye
    await bot.telegram.deleteWebhook();

    // 2. Start Telegram Bot using Polling
    await bot.launch({
      dropPendingUpdates: true
    });
    console.log('Telegram Bot successfully launched in Polling mode 🤖❤️');

  } catch (error) {
    console.error('Failed to start server or bot:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));