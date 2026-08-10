import { Context, Markup } from 'telegraf';
import { User } from '../../models/User';
import { MatchingService } from '../../services/matchingService';
import { Keyboards } from '../keyboards';

export const handleNewLove = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await User.findOne({ telegramUserId: userId, deletedAt: { $exists: false } });
  if (!user) return ctx.reply('Pehle /start karke profile banayein.');

  if (user.status === 'CHATTING') {
    return ctx.reply('Aap already ek chat mein hain! Pehle chat end karein.');
  }
  if (user.status === 'SEARCHING') {
    return ctx.reply('🔎 You are already searching for someone.');
  }

  user.status = 'SEARCHING';
  user.isSearching = true;
  await user.save();

  await ctx.reply('🔎 Searching for your New Love...\n⏱ Search Time: 15 seconds', Keyboards.mainMenu);

  // Try matching over 15 seconds
  let match = null;
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const refreshedUser = await User.findOne({ telegramUserId: userId });
    if (!refreshedUser || !refreshedUser.isSearching) return; // Cancelled or matched elsewhere

    match = await MatchingService.findMatch(refreshedUser);
    if (match) break;
  }

  if (match) {
    const refreshedUser = await User.findOne({ telegramUserId: userId });
    const partnerId = refreshedUser?.partnerId;
    
    await ctx.reply('❤️ **Love Found!**\n\nYou are now connected with a random stranger. You can start chatting now.', Keyboards.chatActive);
    
    if (partnerId && ctx.telegram) {
      try {
        await ctx.telegram.sendMessage(partnerId, '❤️ **Love Found!**\n\nYou are now connected with a random stranger. You can start chatting now.', Keyboards.chatActive);
      } catch (e) {
        console.error('Failed to notify partner:', e);
      }
    }
  } else {
    await User.updateOne({ telegramUserId: userId }, { $set: { status: 'ACTIVE', isSearching: false } });
    await ctx.reply('Sorry 😔 No Love ❣️ Find', Markup.inlineKeyboard([
      [Markup.button.callback('❤️ Try Again', 'btn_new_love'), Markup.button.callback('🔍 Filter', 'btn_filter')]
    ]));
  }
};

export const handleFilterCommand = async (ctx: Context) => {
  await ctx.reply('🔍 **Select Gender Filter:**', Keyboards.filterMenu);
};

export const handleFilterCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;

  const genderMap: any = {
    'filt_male': 'Male',
    'filt_female': 'Female',
    'filt_other': 'Other',
    'filt_all': 'ALL'
  };

  const selectedFilter = genderMap[data];
  if (selectedFilter) {
    await User.updateOne({ telegramUserId: userId }, { $set: { filterGender: selectedFilter } });
    await ctx.answerCbQuery(`Filter set to: ${selectedFilter}`);
    await ctx.editMessageText(`✅ Filter updated to: **${selectedFilter}**\n\nAb aap '❤️ New Love' dabakar search kar sakte hain.`);
  }
};