import { Context } from 'telegraf';
import { User } from '../../models/User';
import { Keyboards } from '../keyboards';

// Temporary memory for profile editing wizard
export const editSession = new Map<number, { step?: string; name?: string; age?: number; gender?: string; country?: string }>();

export const handleProfileCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await User.findOne({ telegramUserId: userId, deletedAt: { $exists: false } });
  if (!user) return ctx.reply('Please type /start to create your profile first.');

  const profileText = `❤️ **MY LOVE PROFILE**\n\n🆔 ID: \`${user.myLoveId}\`\n⭐ Level: ${user.level}\n\n👤 Name: ${user.name}\n🎂 Age: ${user.age}\n⚧ Gender: ${user.gender}\n🌍 Country: ${user.country}\n\n👍 Likes: ${user.likes}\n👎 Dislikes: ${user.dislikes}`;
  
  // Send profile with the Edit Profile inline button below it
  await ctx.replyWithMarkdown(profileText, Keyboards.editProfileInline);
};

export const handleEditProfileCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;

  if (data === 'edit_profile_start') {
    editSession.set(userId, { step: 'EDIT_NAME' });
    await ctx.answerCbQuery();
    await ctx.editMessageText('✏️ **Edit Profile Form**\n\n👤 Please enter your new name:');
  } else if (data.startsWith('edit_gen_')) {
    const gender = data.replace('edit_gen_', '');
    const genderCapitalized = gender.charAt(0).toUpperCase() + gender.slice(1);
    const session = editSession.get(userId);
    if (!session) return;

    session.gender = genderCapitalized;
    session.step = 'EDIT_COUNTRY';
    editSession.set(userId, session);

    await ctx.answerCbQuery();
    await ctx.editMessageText('🌍 Please enter your new country name:');
  }
};

export const handleEditProfileText = async (ctx: Context): Promise<boolean> => {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const session = editSession.get(userId);
  if (!session || !session.step) return false;

  const text = (ctx.message as any)?.text?.trim();
  if (!text) return false;

  if (session.step === 'EDIT_NAME') {
    if (text.length < 2 || text.length > 30) {
      await ctx.reply('⚠️ Name should be between 2 and 30 characters. Please enter again:');
      return true;
    }
    session.name = text;
    session.step = 'EDIT_AGE';
    editSession.set(userId, session);
    await ctx.reply('🎂 Please enter your new age (Numbers only, must be 18+):');
    return true;
  }

  if (session.step === 'EDIT_AGE') {
    const ageNum = parseInt(text, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      editSession.delete(userId);
      await ctx.reply('⚠️ **Access Denied**\n\nSorry, My Love Bot is strictly available for users aged 18+ only. Profile update cancelled.');
      return true;
    }
    session.age = ageNum;
    session.step = 'EDIT_GENDER';
    editSession.set(userId, session);
    await ctx.reply('⚧ Please select your new gender:', Keyboards.editGenderSelection);
    return true;
  }

  if (session.step === 'EDIT_COUNTRY') {
    session.country = text;

    // Update in Database
    const updatedUser = await User.findOneAndUpdate(
      { telegramUserId: userId },
      {
        $set: {
          name: session.name,
          age: session.age,
          gender: session.gender,
          country: session.country
        }
      },
      { new: true }
    );

    editSession.delete(userId);

    if (updatedUser) {
      const profileText = `✅ **Profile Updated Successfully!**\n\n❤️ **MY LOVE PROFILE**\n\n🆔 ID: \`${updatedUser.myLoveId}\`\n⭐ Level: ${updatedUser.level}\n\n👤 Name: ${updatedUser.name}\n🎂 Age: ${updatedUser.age}\n⚧ Gender: ${updatedUser.gender}\n🌍 Country: ${updatedUser.country}\n\n👍 Likes: ${updatedUser.likes}\n👎 Dislikes: ${updatedUser.dislikes}`;
      await ctx.replyWithMarkdown(profileText, Keyboards.mainMenu);
    }
    return true;
  }

  return false;
};

export const handleDeleteAccount = async (ctx: Context) => {
  await ctx.reply('⚠️ **Delete Account?**\n\nThis will permanently delete your My Love Bot profile and stored account data.', Keyboards.deleteConfirmation);
};

export const handleDeleteCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;

  if (data === 'del_yes') {
    await User.updateOne({ telegramUserId: userId }, { $set: { status: 'DELETED', deletedAt: new Date(), isSearching: false } });
    await ctx.answerCbQuery('Account Deleted');
    await ctx.editMessageText('❌ Your account has been successfully deleted. Send /start whenever you want to return.');
  } else if (data === 'del_no') {
    await ctx.answerCbQuery('Cancelled');
    await ctx.editMessageText('Account deletion cancelled.');
  }
};