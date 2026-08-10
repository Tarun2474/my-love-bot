import { Context } from 'telegraf';
import { User } from '../../models/User';
import { Match } from '../../models/Match';
import { Rating } from '../../models/Rating';
import { ChatService } from '../../services/chatService';
import { Keyboards } from '../keyboards';

export const handleEndChat = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await User.findOne({ telegramUserId: userId });
  if (!user || user.status !== 'CHATTING' || !user.partnerId) {
    return ctx.reply('Aap abhi kisi active chat mein nahi hain.');
  }

  const partnerId = user.partnerId;
  const result = await ChatService.endChat(userId, userId);

  if (result) {
    // Notify user 1
    const partner1User = await User.findOne({ telegramUserId: partnerId });
    await ctx.reply(`🛑 Chat Ended.\n\n━━━━━━━━━━━━━━━━━━\n❤️ **YOU MET SOMEONE**\n━━━━━━━━━━━━━━━━━━\nName: ${partner1User?.name || 'Stranger'}\nAge: ${partner1User?.age || 'XX'}\nGender: ${partner1User?.gender || 'Other'}\nCountry: ${partner1User?.country || 'World'}\n━━━━━━━━━━━━━━━━━━`, Keyboards.afterChat);

    // Notify user 2 (Partner)
    try {
      const userObj = await User.findOne({ telegramUserId: userId });
      await ctx.telegram.sendMessage(partnerId, `🛑 Partner ne chat end kar di.\n\n━━━━━━━━━━━━━━━━━━\n❤️ **YOU MET SOMEONE**\n━━━━━━━━━━━━━━━━━━\nName: ${userObj?.name || 'Stranger'}\nAge: ${userObj?.age || 'XX'}\nGender: ${userObj?.gender || 'Other'}\nCountry: ${userObj?.country || 'World'}\n━━━━━━━━━━━━━━━━━━`, Keyboards.afterChat);
    } catch (e) {
      console.error('Failed to notify partner on end:', e);
    }
  }
};

export const handleRatingCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await User.findOne({ telegramUserId: userId });
  if (!user || user.status !== 'RATING') {
    return ctx.answerCbQuery('Rating session expired.');
  }

  const ratingType = data === 'rate_like' ? 'like' : 'dislike';
  
  // Find last ended match for this user
  const lastMatch = await Match.findOne({
    $or: [{ user1: userId }, { user2: userId }],
    status: 'ended'
  }).sort({ endedAt: -1 });

  if (!lastMatch) {
    return ctx.answerCbQuery('Match record not found.');
  }

  const partnerId = lastMatch.user1 === userId ? lastMatch.user2 : lastMatch.user1;

  try {
    await Rating.create({
      matchId: lastMatch.matchId,
      fromUser: userId,
      toUser: partnerId,
      rating: ratingType
    });

    if (ratingType === 'like') {
      await User.updateOne({ telegramUserId: partnerId }, { $inc: { likes: 1 } });
      await ctx.answerCbQuery('❤️ You liked this stranger!');
    } else {
      await User.updateOne({ telegramUserId: partnerId }, { $inc: { dislikes: 1 } });
      await ctx.answerCbQuery('👎 You disliked this stranger.');
    }

    user.status = 'ACTIVE';
    await user.save();

    await ctx.editMessageText('Rating recorded successfully! Aap ab naya partner dhoond sakte hain.');
    await ctx.reply('Neeche menu se option chunein:', Keyboards.mainMenu);
  } catch (e) {
    await ctx.answerCbQuery('Aap is match ko pehle hi rate kar chuke hain.');
  }
};

export const handleMessageRelay = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await User.findOne({ telegramUserId: userId });
  if (!user || user.status !== 'CHATTING' || !user.partnerId) return;

  const partnerId = user.partnerId;

  try {
    if (ctx.message && 'text' in ctx.message) {
      await ctx.telegram.sendMessage(partnerId, ctx.message.text);
    } else if (ctx.message && 'photo' in ctx.message) {
      const photos = ctx.message.photo;
      const fileId = photos[photos.length - 1].file_id;
      const caption = (ctx.message as any).caption || '';
      await ctx.telegram.sendPhoto(partnerId, fileId, { caption });
    } else if (ctx.message && 'sticker' in ctx.message) {
      await ctx.telegram.sendSticker(partnerId, ctx.message.sticker.file_id);
    } else {
      await ctx.reply('⚠️ This message type is currently not supported.');
    }
  } catch (e) {
    console.error('Message relay failed:', e);
    await ctx.reply('⚠️ Message send nahi ho saka, partner shayad chat chhod chuka hai.');
  }
};
