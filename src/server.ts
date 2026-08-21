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

    // Safely launch bot with retry mechanism to prevent conflict errors during deployments
    const launchBotWithRetry = async (retries = 5, delay = 5000) => {
      for (let i = 0; i < retries; i++) {
        try {
          // Purana webhook delete karo taaki conflict na aaye
          await bot.telegram.deleteWebhook();
          
          // Start Telegram Bot using Polling
          await bot.launch({
            dropPendingUpdates: true
          });
          
          console.log('Telegram Bot successfully launched in Polling mode 🤖❤️');
          return;
        } catch (err: any) {
          console.log(`Attempt ${i + 1} failed: ${err.message}. Retrying in ${delay / 1000} seconds...`);
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };

    await launchBotWithRetry();

  } catch (error) {
    console.error('Failed to start server or bot:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));