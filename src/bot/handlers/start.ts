import { Context } from 'telegraf';
import { User } from '../../models/User';
import { Keyboards } from '../keyboards';
import { generateMyLoveId } from '../../services/idGenerator';

// Temporary memory for registration wizard
export const regSession = new Map<number, { name?: string; age?: number; gender?: string; country?: string }>();

export const handleStart = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const existingUser = await User.findOne({ telegramUserId: userId, deletedAt: { $exists: false } });

  if (existingUser) {
    existingUser.status = 'ACTIVE';
    await existingUser.save();
    
    const profileText = `❤️ **MY LOVE PROFILE**\n\n🆔 ID: \`${existingUser.myLoveId}\`\n⭐ Level: ${existingUser.level}\n\n👤 Name: ${existingUser.name}\n🎂 Age: ${existingUser.age}\n⚧ Gender: ${existingUser.gender}\n🌍 Country: ${existingUser.country}\n\n👍 Likes: ${existingUser.likes}\n👎 Dislikes: ${existingUser.dislikes}`;
    return ctx.replyWithMarkdown(profileText, Keyboards.mainMenu);
  }

  const welcomeText = `❤️ **Welcome to My Love Bot**\n\nMy Love Bot tumhe randomly real strangers se connect karta hai.\nTum apni profile create karo aur duniya ke kisi bhi available person se randomly baat karo.\n\n**Features:**\n❤️ Random Stranger Matching\n💬 Private Stranger Chat\n🔎 Gender Filters\n👍 Like / 👎 Dislike\n⭐ Experience Level\n👤 Personal Profile\n\n⚠️ **Important Safety Rule**\nThis bot is strictly for users aged 18+. Agar tum 18 years se kam ho, please is bot ka use mat karo.`;
  
  await ctx.replyWithMarkdown(welcomeText, Keyboards.welcome);
};

export const handleRegistrationCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;

  if (data === 'btn_start') {
    regSession.set(userId, {});
    await ctx.answerCbQuery();
    await ctx.editMessageText('👤 **What is your name?**\n\nKripya apna naam type karke bhejein:');
  } else if (data === 'btn_about') {
    await ctx.answerCbQuery();
    await ctx.reply('My Love Bot ek secure aur private platform hai jahan aap real users se bina personal info share kiye chat kar sakte hain.');
  } else if (data.startsWith('gen_')) {
    const gender = data.replace('gen_', '');
    const genderCapitalized = gender.charAt(0).toUpperCase() + gender.slice(1);
    const session = regSession.get(userId) || {};
    session.gender = genderCapitalized;
    regSession.set(userId, session);

    await ctx.answerCbQuery();
    await ctx.editMessageText('🌍 **Select your country:**\n\nKripya apne country ka naam type karke bhejein (jaise: India, USA, etc.):');
  } else if (data === 'age_yes') {
    const session = regSession.get(userId) || {};
    session.age = 18; // Verified >= 18
    regSession.set(userId, session);

    await ctx.answerCbQuery();
    await ctx.editMessageText('♂️ **Select your gender:**', Keyboards.genderSelection);
  } else if (data === 'age_no') {
    await ctx.answerCbQuery();
    await ctx.editMessageText('⚠️ **Access Denied**\n\nSorry, My Love Bot is strictly available for users aged 18+ only.');
  } else if (data === 'btn_save_profile') {
    const session = regSession.get(userId);
    if (!session || !session.name || !session.age || !session.gender || !session.country) {
      return ctx.answerCbQuery('Session expired. Please type /start again.');
    }

    const myLoveId = await generateMyLoveId();
    const newUser = await User.create({
      telegramUserId: userId,
      myLoveId,
      name: session.name,
      age: session.age,
      gender: session.gender,
      country: session.country,
      isAdult: true,
      status: 'ACTIVE'
    });

    regSession.delete(userId);
    await ctx.answerCbQuery('Profile Saved Successfully! 🎉');
    await ctx.editMessageText(`✅ **Profile Created Successfully!**\n\n❤️ **MY LOVE PROFILE**\n\n🆔 ID: \`${newUser.myLoveId}\`\n⭐ Level: 1\n👤 Name: ${newUser.name}\n🎂 Age: ${newUser.age}\n⚧ Gender: ${newUser.gender}\n🌍 Country: ${newUser.country}\n\n👍 Likes: 0\n👎 Dislikes: 0`);
    await ctx.reply('Neeche diye gaye menu se aap chat shuru kar sakte hain:', Keyboards.mainMenu);
  }
};

export const handleRegistrationText = async (ctx: Context): Promise<boolean> => {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const session = regSession.get(userId);
  if (!session) return false;

  const text = (ctx.message as any)?.text?.trim();
  if (!text) return false;

  if (!session.name) {
    if (text.length < 2 || text.length > 30) {
      await ctx.reply('⚠️ Naam thoda chhota ya valid rakhein (2 se 30 characters). Dobara bhejein:');
      return true;
    }
    session.name = text;
    regSession.set(userId, session);
    await ctx.reply('🎂 **What is your age?**\n\nKripya apni age numbers mein type karein (e.g. 21):');
    return true;
  }

  if (!session.age) {
    const ageNum = parseInt(text, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      regSession.delete(userId);
      await ctx.reply('⚠️ **Access Denied**\n\nSorry, My Love Bot is strictly available for users aged 18+ only.');
      return true;
    }
    session.age = ageNum;
    regSession.set(userId, session);
    await ctx.reply('Are you above 18?', Keyboards.ageConfirmation);
    return true;
  }

  if (!session.country) {
    session.country = text;
    regSession.set(userId, session);

    const preview = `━━━━━━━━━━━━━━\n❤️ **YOUR PROFILE**\n━━━━━━━━━━━━━━\n\nName: ${session.name}\nAge: ${session.age}\nGender: ${session.gender}\nCountry: ${session.country}\n\n18+ Verified: ✅\n━━━━━━━━━━━━━━`;
    await ctx.replyWithMarkdown(preview, Keyboards.saveProfile);
    return true;
  }

  return false;
};
