import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { app, bot } from './app';
import http from 'http';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

// Yeh hai tumhara Render ka exact live URL jo logs mein aaya tha
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

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Self-pinging code taaki bot 24/7 active rahe (Har 10 minute mein khud ko ping karega)
setInterval(() => {
  http.get(RENDER_URL, (res) => {
    console.log(`Self-ping keep-alive status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Self-ping error:', err.message);
  });
}, 10 * 60 * 1000);