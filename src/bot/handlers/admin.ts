import { Context, Markup } from 'telegraf';
import { User } from '../../models/User';

let currentAdminId: string | null = '5620505195'; // Aapki set ID

export const handleAdminCommand = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const messageText = (ctx.message as any)?.text || '';
  const args = messageText.split(' ').slice(1).join(' ').trim();

  if (args) {
    currentAdminId = args;
    return ctx.reply(`👑 Success! New Admin Telegram ID set to: \`${args}\``, { parse_mode: 'Markdown' });
  }

  if (currentAdminId && userId !== currentAdminId) {
    return;
  }

  if (!currentAdminId) {
    currentAdminId = userId;
    return ctx.reply(`👑 You have been successfully registered as the Bot Admin/Owner!\nYour ID: \`${userId}\``, { parse_mode: 'Markdown' });
  }

  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: 'ACTIVE' });
  const blockedUsers = await User.countDocuments({ isBlocked: true });

  const dashboardText = `👑 **ADMIN DASHBOARD** 👑\n\n` +
    `📊 **Live Stats:**\n` +
    `• Total Users: ${totalUsers}\n` +
    `• Active Users: ${activeUsers}\n` +
    `• Blocked Users: ${blockedUsers}\n\n` +
    `🔍 To search a user, send:\n` +
    `\`/search MLB2026001\``;

  return ctx.reply(dashboardText, { parse_mode: 'Markdown' });
};

export const handleAdminSearch = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== currentAdminId) return;

  const messageText = (ctx.message as any)?.text || '';
  const args = messageText.split(' ').slice(1).join(' ').trim();

  if (!args) {
    return ctx.reply('⚠️ Please provide a MyLove ID. Example: `/search MLB2026001`', { parse_mode: 'Markdown' });
  }

  // Ab yeh sirf aur sirf MyLove ID se search karega!
  const targetUser = await User.findOne({ myLoveId: args });

  if (!targetUser) {
    return ctx.reply(`❌ No user found with MyLove ID: ${args}`);
  }

  const statusText = targetUser.isBlocked ? '🔴 BLOCKED' : '🟢 ACTIVE';
  const keyboard = Markup.inlineKeyboard([
    targetUser.isBlocked
      ? [Markup.button.callback('🔓 Unblock User', `adm_unblock_${targetUser.telegramUserId}`)]
      : [Markup.button.callback('🔒 Block User', `adm_block_${targetUser.telegramUserId}`)]
  ]);

  const profileInfo = `👤 **User Profile Found:**\n\n` +
    `• Name: ${targetUser.name || 'N/A'}\n` +
    `• MyLove ID: \`${targetUser.myLoveId}\`\n` +
    `• Telegram ID: \`${targetUser.telegramUserId}\`\n` +
    `• Age: ${targetUser.age || 'N/A'}\n` +
    `• Gender: ${targetUser.gender || 'N/A'}\n` +
    `• Status: ${statusText}`;

  return ctx.reply(profileInfo, { parse_mode: 'Markdown', ...keyboard });
};

export const handleAdminActions = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== currentAdminId) return;

  const cbData = (ctx.callbackQuery as any)?.data || '';
  
  if (cbData.startsWith('adm_block_')) {
    const targetId = cbData.replace('adm_block_', '');
    await User.updateOne({ telegramUserId: targetId }, { $set: { isBlocked: true } });
    
    await ctx.answerCbQuery('User has been blocked successfully!');
    await ctx.editMessageText(`🔴 **User with Telegram ID (${targetId}) is now BLOCKED.**`, { parse_mode: 'Markdown' });

    try {
      await ctx.telegram.sendMessage(
        Number(targetId),
        `🚫 **You have been blocked from using this bot.**\n\nIf you think this was a mistake, you can submit an appeal using the /complaint command and provide your proof.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  } 
  else if (cbData.startsWith('adm_unblock_')) {
    const targetId = cbData.replace('adm_unblock_', '');
    await User.updateOne({ telegramUserId: targetId }, { $set: { isBlocked: false } });

    await ctx.answerCbQuery('User has been unblocked!');
    await ctx.editMessageText(`🟢 **User with Telegram ID (${targetId}) has been UNBLOCKED.**`, { parse_mode: 'Markdown' });

    try {
      await ctx.telegram.sendMessage(
        Number(targetId),
        `✅ **Good news! Your account has been unblocked by the admin.** You can now use the bot normally.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }
};