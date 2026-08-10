import { Context, Markup } from 'telegraf';
import { Announcement } from '../../models/Announcement';

export const handleAnnouncementCommand = async (ctx: Context) => {
  const activeAnn = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
  
  if (!activeAnn) {
    return ctx.reply('📢 No active announcements right now. Stay tuned!');
  }

  await ctx.reply(`📢 **LATEST ANNOUNCEMENT**\n\n${activeAnn.message}\n\n_Date: ${new Date(activeAnn.createdAt).toLocaleDateString()}_`, { parse_mode: 'Markdown' });
};

export const handlePrivacyCommand = async (ctx: Context) => {
  await ctx.reply('🔒 **Privacy Policy**\n\nYour privacy is our top priority. We do not share your personal information, phone number, or Telegram username with anyone.');
};

export const handleContactCommand = async (ctx: Context) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('Open Complaint Bot', 'https://t.me/complaint_mylove_bot')]
  ]);

  await ctx.reply('📞 **Contact Us & Support**\n\nFacing any issue, bug, or want to report a user? Click the button below to open our official complaint bot:', keyboard);
};

export const handleCopyrightCommand = async (ctx: Context) => {
  await ctx.reply('©️ **2026 All Rights Reserved**\n\nMy Love Bot ❤️ is protected under copyright laws.');
};