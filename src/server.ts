import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { app, bot } from './app';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const RENDER_URL = 'https://my-love-bot-is9e.onrender.com';

// Telegram webhook route
app.use(bot.webhookCallback('/telegram'));

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    app.listen(PORT, async () => {
      console.log(`Server is running on port ${PORT} 🚀`);

      const webhookUrl = `${RENDER_URL}/telegram`;

      try {
        // Remove old webhook configuration
        await bot.telegram.deleteWebhook();

        // Set production webhook
        await bot.telegram.setWebhook(webhookUrl);

        console.log(`Telegram webhook set successfully ✅`);
        console.log(`Webhook URL: ${webhookUrl}`);
        console.log(`Telegram Bot is running in WEBHOOK mode 🤖❤️`);
      } catch (error) {
        console.error('Failed to configure Telegram webhook:', error);
      }
    });

    // Graceful shutdown
    process.once('SIGINT', async () => {
      await bot.telegram.deleteWebhook();
      bot.stop('SIGINT');
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      await bot.telegram.deleteWebhook();
      bot.stop('SIGTERM');
      process.exit(0);
    });

  } code (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();