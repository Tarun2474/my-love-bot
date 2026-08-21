import { Context, Markup } from 'telegraf';
import { User } from '../../models/User';

// In-memory ya database me admin ID store karne ke liye simple check
let currentAdminId: string | null = null;

export const handleAdminCommand = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const messageText = (ctx.message as any)?.text || '';
  const args = messageText.split(' ').slice(1).join(' ').trim();

  // Agar admin set nahi hai ya user ne ID change karne ke liye /admin <ID> likha hai
  if (args) {
    currentAdminId = args;
    return ctx.reply(`👑 Success! New Admin Telegram ID set to: \`${args}\``, { parse_mode: 'Markdown' });
  }

  // Agar koi aur user /admin likhe aur koi admin set na ho, ya koi aur koshish kare
  if (currentAdminId && userId !== currentAdminId) {
    return; // Aam user ke liye bilkul chup rahega, pata bhi nahi chalega ki ye kya command hai
  }

  // Agar pehli baar koi use kar raha hai aur admin set nahi hai, toh yehi user admin ban jayega
  if (!currentAdminId) {
    currentAdminId = userId;
    return ctx.reply(`👑 You have been successfully registered as the Bot Admin/Owner!\nYour ID: \`${userId}\``, { parse_mode: 'Markdown' });
  }

  // Admin Dashboard View
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: 'ACTIVE' });
  const blockedUsers = await User.countDocuments({ isBlocked: true });

  const dashboardText = `👑 **ADMIN DASHBOARD** 👑\n\n` +
    `📊 **Live Stats:**\n` +
    `• Total Users: ${totalUsers}\n` +
    `• Active Users: ${activeUsers}\n` +
    `• Blocked Users: ${blockedUsers}\n\n` +
    `🔍 To search or manage a user, send:\n` +
    `\`/search <Telegram_User_ID>\``;

  return ctx.reply(dashboardText, { parse_mode: 'Markdown' });
};

// User Search by Admin (/search <id>)
export const handleAdminSearch = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== currentAdminId) return;

  const messageText = (ctx.message as any)?.text || '';
  const args = messageText.split(' ').slice(1).join(' ').trim();

  if (!args) {
    return ctx.reply('⚠️ Please provide a user ID. Example: `/search 123456789`', { parse_mode: 'Markdown' });
  }

  const targetUser = await User.findOne({ telegramUserId: args });
  if (!targetUser) {
    return ctx.reply(`❌ No user found with ID: ${args}`);
  }

  const statusText = targetUser.isBlocked ? '🔴 BLOCKED' : '🟢 ACTIVE';
  const keyboard = Markup.inlineKeyboard([
    targetUser.isBlocked
      ? [Markup.button.callback('🔓 Unblock User', `adm_unblock_${targetUser.telegramUserId}`)]
      : [Markup.button.callback('🔒 Block User', `adm_block_${targetUser.telegramUserId}`)]
  ]);

  const profileInfo = `👤 **User Profile Found:**\n\n` +
    `• Name: ${targetUser.name || 'N/A'}\n` +
    `• Telegram ID: \`${targetUser.telegramUserId}\`\n` +
    `• Age: ${targetUser.age || 'N/A'}\n` +
    `• Gender: ${targetUser.gender || 'N/A'}\n` +
    `• Status: ${statusText}`;

  return ctx.reply(profileInfo, { parse_mode: 'Markdown', ...keyboard });
};

// Admin Block/Unblock Button Actions
export const handleAdminActions = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== currentAdminId) return;

  const cbData = (ctx.callbackQuery as any)?.data || '';
  
  if (cbData.startsWith('adm_block_')) {
    const targetId = cbData.replace('adm_block_', '');
    await User.updateOne({ telegramUserId: targetId }, { $set: { isBlocked: true } });
    
    await ctx.answerCbQuery('User has been blocked successfully!');
    await ctx.editMessageText(`🔴 **User (${targetId}) is now BLOCKED.**`, { parse_mode: 'Markdown' });

    // Blocked user ko message bhejo
    try {
      await ctx.telegram.sendMessage(
        Number(targetId),
        `🚫 **You have been blocked from using this bot.**\n\nIf you think this was a mistake, you can submit an appeal using the /complaint command and provide your proof.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      // Ignore agar bot ko block kiya ho
    }
  } 
  else if (cbData.startsWith('adm_unblock_')) {
    const targetId = cbData.replace('adm_unblock_', '');
    await User.updateOne({ telegramUserId: targetId }, { $set: { isBlocked: false } });

    await ctx.answerCbQuery('User has been unblocked!');
    await ctx.editMessageText(`🟢 **User (${targetId}) has been UNBLOCKED.**`, { parse_mode: 'Markdown' });

    try {
      await ctx.telegram.sendMessage(
        Number(targetId),
        `✅ **Good news! Your account has been unblocked by the admin.** You can now use the bot normally.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }
};