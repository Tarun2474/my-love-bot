import { Context, Markup } from 'telegraf';
import { User } from '../../models/User';

const ADMIN_ID = '5620505195'; // Official Admin ID

// 1. Admin Dashboard Command (/admin)
export const handleAdminCommand = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== ADMIN_ID) return; // Hidden from all regular users

  // Total registered users (excluding those who permanently deleted their accounts)
  const totalUsers = await User.countDocuments({ status: { $ne: 'DELETED' } });
  const activeUsers = await User.countDocuments({ status: 'ACTIVE' });
  const blockedUsers = await User.countDocuments({ isBlocked: true });

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Show Blocked List', 'adm_show_blocked')],
    [Markup.button.callback('📊 Export Users CSV', 'adm_export_csv')]
  ]);

  const dashboardText = `👑 **ADMIN CONTROL PANEL** 👑\n\n` +
    `📊 **Live Statistics:**\n` +
    `• Total Registered Users: ${totalUsers}\n` +
    `• Active Users: ${activeUsers}\n` +
    `• Blocked Users: ${blockedUsers}\n\n` +
    `🛠 **Available Commands:**\n` +
    `• Search User: \`/search MLB2026001\`\n` +
    `• Broadcast Message: \`/broadcast Your message here\`\n` +
    `• Warn User: \`/warn MLB2026001\`\n\n` +
    `Select an option below:`;

  return ctx.reply(dashboardText, { parse_mode: 'Markdown', ...keyboard });
};

// 2. Search User by MyLove ID
export const handleAdminSearch = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== ADMIN_ID) return;

  const messageText = (ctx.message as any)?.text || '';
  const args = messageText.split(' ').slice(1).join(' ').trim();

  if (!args) {
    return ctx.reply('⚠️ Please provide a MyLove ID. Example: `/search MLB2026001`', { parse_mode: 'Markdown' });
  }

  // Sirf unko search karega jinka account DELETED nahi hai
  const targetUser = await User.findOne({ myLoveId: args, status: { $ne: 'DELETED' } });
  
  if (!targetUser) {
    return ctx.reply(`❌ No user found with MyLove ID: \`${args}\`.\n*(Note: They might have permanently deleted their account or the ID is incorrect)*`, { parse_mode: 'Markdown' });
  }

  const statusText = targetUser.isBlocked ? '🔴 BLOCKED' : '🟢 ACTIVE';
  const keyboard = Markup.inlineKeyboard([
    targetUser.isBlocked
      ? [Markup.button.callback('🔓 Unblock User', `adm_unblock_${targetUser.telegramUserId}`)]
      : [Markup.button.callback('🔒 Block User', `adm_block_${targetUser.telegramUserId}`)]
  ]);

  const profileInfo = `👤 **User Profile Details:**\n\n` +
    `• Name: ${targetUser.name || 'N/A'}\n` +
    `• MyLove ID: \`${targetUser.myLoveId}\`\n` +
    `• Telegram ID: \`${targetUser.telegramUserId}\`\n` +
    `• Age: ${targetUser.age || 'N/A'}\n` +
    `• Gender: ${targetUser.gender || 'N/A'}\n` +
    `• Warnings: ${targetUser.warnings || 0} / 5\n` +
    `• Status: ${statusText}`;

  return ctx.reply(profileInfo, { parse_mode: 'Markdown', ...keyboard });
};

// 3. Broadcast Message Command (/broadcast <message>)
export const handleBroadcastCommand = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== ADMIN_ID) return;

  const messageText = (ctx.message as any)?.text || '';
  const broadcastMsg = messageText.replace(/^\/broadcast\s*/, '').trim();

  if (!broadcastMsg) {
    return ctx.reply('⚠️ Please provide a message to broadcast. Example:\n`/broadcast Hello everyone, new update is live!`', { parse_mode: 'Markdown' });
  }

  // Broadcast will only go to users who haven't deleted their accounts
  const users = await User.find({ status: { $ne: 'DELETED' } });
  let successCount = 0;

  await ctx.reply(`📢 Broadcasting your message to ${users.length} users. Please wait...`);

  for (const user of users) {
    try {
      await ctx.telegram.sendMessage(
        Number(user.telegramUserId),
        broadcastMsg,
        { parse_mode: 'Markdown' }
      );
      successCount++;
    } catch (err) {}
  }

  return ctx.reply(`✅ Broadcast completed successfully!\nDelivered to: ${successCount} users.`);
};

// 4. Warning System Command (/warn <MyLoveID>)
export const handleWarnCommand = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== ADMIN_ID) return;

  const messageText = (ctx.message as any)?.text || '';
  const myLoveId = messageText.split(' ').slice(1).join(' ').trim();

  if (!myLoveId) {
    return ctx.reply('⚠️ Please provide a MyLove ID to warn. Example: `/warn MLB2026001`', { parse_mode: 'Markdown' });
  }

  const targetUser = await User.findOne({ myLoveId, status: { $ne: 'DELETED' } });
  if (!targetUser) {
    return ctx.reply(`❌ No active user found with MyLove ID: \`${myLoveId}\``, { parse_mode: 'Markdown' });
  }

  targetUser.warnings = (targetUser.warnings || 0) + 1;

  if (targetUser.warnings >= 5) {
    targetUser.isBlocked = true;
    await targetUser.save();

    try {
      await ctx.telegram.sendMessage(
        Number(targetUser.telegramUserId),
        `🚫 **Account Blocked**\nYou have received 5 official warnings from the administration for violating community rules. Your account has been blocked. You may submit an appeal using the /complaint command.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}

    return ctx.reply(`⚠️ User \`${myLoveId}\` has reached **5/5 warnings** and has been **automatically BLOCKED**!`, { parse_mode: 'Markdown' });
  } else {
    await targetUser.save();

    try {
      await ctx.telegram.sendMessage(
        Number(targetUser.telegramUserId),
        `⚠️ **Official Warning (${targetUser.warnings}/5)**\nYou have received a warning from the bot administration. Please follow the rules to avoid account suspension.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}

    return ctx.reply(`⚠️ Warning issued to user \`${myLoveId}\`. Current warning count: **${targetUser.warnings}/5**`, { parse_mode: 'Markdown' });
  }
};

// 5. Admin Interactive Buttons Actions Handler
export const handleAdminActions = async (ctx: Context) => {
  const userId = ctx.from?.id.toString();
  if (userId !== ADMIN_ID) return;

  const cbData = (ctx.callbackQuery as any)?.data || '';

  // Show Blocked List
  if (cbData === 'adm_show_blocked') {
    await ctx.answerCbQuery();
    const blockedUsers = await User.find({ isBlocked: true, status: { $ne: 'DELETED' } });

    if (blockedUsers.length === 0) {
      return ctx.reply('🟢 There are currently no blocked active users in the database.');
    }

    let text = `🔴 **BLOCKED USERS LIST (${blockedUsers.length}):**\n\n`;
    const buttons = [];

    for (const u of blockedUsers) {
      text += `• Name: ${u.name} | ID: \`${u.myLoveId}\`\n`;
      buttons.push([Markup.button.callback(`🔓 Unblock ${u.name} (${u.myLoveId})`, `adm_unblock_${u.telegramUserId}`)]);
    }

    return ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  }

  // Export Users CSV Report
  if (cbData === 'adm_export_csv') {
    await ctx.answerCbQuery('Generating CSV report...');
    
    // Yahan saare users fetch honge (including DELETED ones)
    const users = await User.find({});
    
    let csvContent = 'MyLoveID,TelegramID,Name,Age,Gender,Status,Warnings,JoinedDate\n';
    for (const u of users) {
      // Agar account deleted hai, toh CSV mein strict 'DELETED' dikhayega
      const displayStatus = u.status === 'DELETED' ? 'DELETED' : (u.isBlocked ? 'BLOCKED' : u.status);
      
      csvContent += `${u.myLoveId},${u.telegramUserId},"${u.name || ''}",${u.age || ''},${u.gender || ''},${displayStatus},${u.warnings || 0},${u.createdAt}\n`;
    }

    const buffer = Buffer.from(csvContent, 'utf-8');
    return ctx.replyWithDocument({
      source: buffer,
      filename: `Users_Report_${new Date().toISOString().split('T')[0]}.csv`
    }, { caption: '📊 Here is the complete exported users CSV report.' });
  }

  // Block User via Inline Button
  if (cbData.startsWith('adm_block_')) {
    const targetId = cbData.replace('adm_block_', '');
    await User.updateOne({ telegramUserId: targetId }, { $set: { isBlocked: true } });
    
    await ctx.answerCbQuery('User has been blocked successfully!');
    await ctx.editMessageText(`🔴 **User with Telegram ID (${targetId}) is now BLOCKED.**`, { parse_mode: 'Markdown' });
  } 

  // Unblock User via Inline Button
  else if (cbData.startsWith('adm_unblock_')) {
    const targetId = cbData.replace('adm_unblock_', '');
    await User.updateOne({ telegramUserId: targetId }, { $set: { isBlocked: false, warnings: 0 } });

    await ctx.answerCbQuery('User has been unblocked!');
    await ctx.editMessageText(`🟢 **User with Telegram ID (${targetId}) has been UNBLOCKED and warnings reset.**`, { parse_mode: 'Markdown' });
  }
};