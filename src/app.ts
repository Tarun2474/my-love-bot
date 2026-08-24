import { Telegraf } from 'telegraf';
import express from 'express';
import { User } from './models/User';
import { handleStart, handleRegistrationCallbacks, handleRegistrationText } from './bot/handlers/start';
import { handleProfileCommand, handleEditProfileCallbacks, handleEditProfileText, handleDeleteAccount, handleDeleteCallbacks } from './bot/handlers/profile';
import { handleNewLove, handleFilterCommand, handleFilterCallbacks } from './bot/handlers/matching';
import { handleEndChat, handleRatingCallbacks, handleMessageRelay } from './bot/handlers/chat';
import { handleAnnouncementCommand, handlePrivacyCommand, handleContactCommand, handleCopyrightCommand, handleDeleteAnnouncementCommand } from './bot/handlers/announcement';
import { handleComplaintStart, handleComplaintCallbacks, handleComplaintText, handleComplaintPhoto } from './bot/handlers/complaintBot';
import { handleAdminCommand, handleAdminSearch, handleAdminActions } from './bot/handlers/admin';

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('BOT_TOKEN is missing in environment variables.');
}

export const bot = new Telegraf(botToken);
export const app = express();

app.use(express.json());

// Set Telegram Bot Commands Menu automatically (Admin command is kept hidden)
bot.telegram.setMyCommands([
  { command: 'start', description: 'Start My Love Bot' },
  { command: 'new', description: 'Find a new random love' },
  { command: 'end', description: 'End current chat' },
  { command: 'profile', description: 'View your profile' },
  { command: 'editprofile', description: 'Edit your profile' },
  { command: 'announcement', description: 'View latest announcement' },
  { command: 'complaint', description: 'Submit a complaint or support ticket' },
  { command: 'privacy', description: 'Privacy Policy' },
  { command: 'contact', description: 'Contact Us' },
  { command: 'restart', description: 'Restart bot' },
  { command: 'deleteaccount', description: 'Delete your account' }
]);

// Bot Slash Commands Setup
bot.start(handleStart);
bot.command('new', handleNewLove);
bot.command('end', handleEndChat);
bot.command('profile', handleProfileCommand);
bot.command('myprofile', handleProfileCommand);
bot.command('editprofile', handleProfileCommand);
bot.command('edit_profile', handleProfileCommand);
bot.command('announcement', handleAnnouncementCommand);
bot.command('deleteannouncement', handleDeleteAnnouncementCommand);
bot.command('complaint', handleComplaintStart);
bot.command('privacy', handlePrivacyCommand);
bot.command('contact', handleContactCommand);
bot.command('deleteaccount', handleDeleteAccount);


// Private Admin Commands (Hidden from public menu)
bot.command('admin', handleAdminCommand);
bot.command('search', handleAdminSearch);
bot.command('broadcast', handleBroadcastCommand);

// Text & Form Handlers Middleware
bot.on('text', async (ctx, next) => {
  const userId = ctx.from?.id.toString();
  
  // Blocked user check (Blocked users can only use /complaint or /start for appeal)
  if (userId) {
    const user = await User.findOne({ telegramUserId: userId });
    if (user && user.isBlocked) {
      const text = ctx.message?.text || '';
      if (!text.startsWith('/complaint') && !text.startsWith('/start')) {
        return ctx.reply('🚫 **Access Denied:** You are blocked from using this bot. If you believe this is a mistake, please use `/complaint` to submit your proof and appeal.', { parse_mode: 'Markdown' });
      }
    }
  }

  // 1. Check if user is filling complaint form
  const complaintHandled = await handleComplaintText(ctx);
  if (complaintHandled) return;

  // 2. Check if user is editing profile
  const editHandled = await handleEditProfileText(ctx);
  if (editHandled) return;

  // 3. Check if user is registering
  const handled = await handleRegistrationText(ctx);
  if (!handled) {
    const text = ctx.message.text;
    if (text === '❤️ New Love') return handleNewLove(ctx);
    if (text === '👤 Profile') return handleProfileCommand(ctx);
    if (text === '🔍 Filter') return handleFilterCommand(ctx);
    if (text === '🛑 Chat End') return handleEndChat(ctx);
    if (text === '🗑 Delete Account') return handleDeleteAccount(ctx);
    if (text === '✏️ Edit Profile') return handleProfileCommand(ctx);
    if (text === '📢 Announcement') return handleAnnouncementCommand(ctx);
    if (text === '🔒 Privacy Policy') return handlePrivacyCommand(ctx);
    if (text === '📞 Contact Us') return handleContactCommand(ctx);
    if (text === '©️ Copyright') return handleCopyrightCommand(ctx);
    if (text === '🔄 Restart') {
      await User.updateOne({ telegramUserId: ctx.from?.id }, { $set: { status: 'ACTIVE', isSearching: false }, $unset: { partnerId: 1, activeMatchId: 1 } });
      return ctx.reply('Bot state restarted successfully.');
    }
    
    // Otherwise relay message during active chat
    return handleMessageRelay(ctx);
  }
});

// Callback Queries (Inline Buttons Handlers)
bot.action(/^(btn_start$|btn_about|gen_|age_|btn_save_profile)/, handleRegistrationCallbacks);
bot.action(/^(edit_profile_start|edit_gen_)/, handleEditProfileCallbacks);
bot.action(/^btn_announcement$/, handleAnnouncementCommand);
bot.action(/^btn_privacy$/, handlePrivacyCommand);
bot.action(/^(del_)/, handleDeleteCallbacks);
bot.action(/^(filt_)/, handleFilterCallbacks);
bot.action(/^(btn_start_complaint|proof_upload|proof_none|submit_complaint)$/, handleComplaintCallbacks);

// Admin Action Buttons (Block / Unblock callbacks)
bot.action(/^adm_/, handleAdminActions);

bot.action(/^(rate_|btn_new_love)/, async (ctx) => {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'btn_new_love') {
    await ctx.answerCbQuery();
    return handleNewLove(ctx);
  }
  return handleRatingCallbacks(ctx);
});

// Photo and Sticker Handlers (for chat relay and complaint screenshots)
bot.on('photo', async (ctx) => {
  const complaintPhotoHandled = await handleComplaintPhoto(ctx);
  if (complaintPhotoHandled) return;
  return handleMessageRelay(ctx);
});

bot.on('sticker', handleMessageRelay);