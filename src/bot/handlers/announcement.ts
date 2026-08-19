import { Context, Markup } from 'telegraf';
import { Announcement } from '../../models/Announcement';
import { User } from '../../models/User';

// Yahan apni asli Telegram numeric ID daal dena (jaise '123456789')
const ADMIN_ID = '5620505195';

export const handleAnnouncementCommand = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  const messageText = (ctx.message as any)?.text || '';
  const args = messageText.split(' ').slice(1).join(' ');

  // 1. Agar tum (Owner/Admin) ho aur message ke sath text bhi bheja hai
  if (userId === ADMIN_ID && args.trim().length > 0) {
    // Database mein nayi announcement save hogi
    await Announcement.create({ message: args, isActive: true });

    // Saare active users ko broadcast karo
    const users = await User.find({ status: 'ACTIVE' });
    let successCount = 0;

    await ctx.reply(`📢 Broadcasting your announcement to ${users.length} users...`);

    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(
          Number(user.telegramUserId),
          `📢 **ANNOUNCEMENT**\n\n${args}\n\n_Date: ${new Date().toLocaleDateString()}_`,
          { parse_mode: 'Markdown' }
        );
        successCount++;
      } catch (err) {
        // Agar kisi user ne bot block kiya hoga toh skip ho jayega
      }
    }

    return ctx.reply(`✅ Announcement successfully broadcasted to ${successCount} users by Owner!`);
  }

  // 2. Agar koi aam user command deta hai (ya tum bina text ke likhte ho), toh sirf latest announcement dikhegi
  const activeAnn = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
  
  if (!activeAnn) {
    return ctx.reply('📢 No active announcements right now. Stay tuned!');
  }

  await ctx.reply(`📢 **LATEST ANNOUNCEMENT**\n\n${activeAnn.message}\n\n_Date: new Date(activeAnn.createdAt).toLocaleDateString()}_`, { parse_mode: 'Markdown' });
};

export const handlePrivacyCommand = async (ctx: Context) => {
  await ctx.reply('🔒 **Privacy Policy**\n\nYour privacy is our top priority. We do not share your personal information, phone number, or Telegram username with anyone.');
};

export const handleContactCommand = async (ctx: Context) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Complaint', 'btn_start_complaint')]
  ]);

  await ctx.reply('📞 **Support & Complaints**\n\nFacing any issue, bug, or want to report a user? Click the button below to submit a complaint securely:', keyboard);
};

export const handleCopyrightCommand = async (ctx: Context) => {
  await ctx.reply('©️ **2026 All Rights Reserved**\n\nMy Love Bot ❤️ is protected under copyright laws.');
};