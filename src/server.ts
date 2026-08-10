import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/database';
import { app, bot } from './app';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  // Start Express Server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
  });

  // Start Telegram Bot (Using Polling for Development)
  bot.launch().then(() => {
    console.log('Telegram Bot successfully launched! 🤖❤️');
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

startServer();
