import { Context, Markup } from 'telegraf';

// Temporary memory for complaint sessions
const complaintSessions = new Map<number, { step: string; userId?: string; targetId?: string; message?: string }>();

export const handleComplaintStart = async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  complaintSessions.set(chatId, { step: 'WAITING_USER_ID' });

  await ctx.reply(
    `🚨 **Official Complaint Portal**\n\n` +
    `Apko jo bhi problem hai humse, humare bot se, ya kisi any user se, toh aap yahan complaint kar sakte hain.\n\n` +
    `⚠️ **Rule:** Complaint karne ke liye aapko apni **User ID** mention karni zaroori hai aur sath mein proof (jaise screenshot) hona chahiye.\n\n` +
    `👉 Sabse pehle apni **User ID** type karke bhejiye:`,
    { parse_mode: 'Markdown' }
  );
};

export const handleComplaintText = async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const session = complaintSessions.get(chatId);
  if (!session) return;

  const text = 'text' in ctx.message! ? ctx.message.text : '';

  if (session.step === 'WAITING_USER_ID') {
    session.userId = text;
    session.step = 'WAITING_TARGET_ID';
    await ctx.reply(`✅ User ID saved: \`${text}\`\n\n👉 Ab us user/person ki **Target ID** (ya username) type karke bhejiye jiski aap complaint karna chahte hain:`, { parse_mode: 'Markdown' });
    return;
  }

  if (session.step === 'WAITING_TARGET_ID') {
    session.targetId = text;
    session.step = 'WAITING_MESSAGE';
    await ctx.reply(`✅ Target ID saved: \`${text}\`\n\n👉 Ab apni **Complaint message** detail mein type karke bhejiye:`, { parse_mode: 'Markdown' });
    return;
  }

  if (session.step === 'WAITING_MESSAGE') {
    session.message = text;
    session.step = 'DONE';
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📤 Upload Proof', 'proof_upload')],
      [Markup.button.callback('❌ I have No Proof', 'proof_none')]
    ]);

    await ctx.reply(
      `📝 **Complaint Summary:**\n` +
      `• Your ID: \`${session.userId}\`\n` +
      `• Target ID: \`${session.targetId}\`\n` +
      `• Issue: ${session.message}\n\n` +
      `👉 Aage badhne ke liye niche diye gaye button par click karein:`,
      { parse_mode: 'Markdown', ...keyboard }
    );
    return;
  }
};

export const handleProofUploadAction = async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  await ctx.answerCbQuery();
  await ctx.reply(`📸 Please ab apna **screenshot ya proof** photo ya document ke roop mein yahan bhej dein. Aapka proof aapki complaint ke sath attach kar diya jayega!`);
};

export const handleProofNoneAction = async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  complaintSessions.delete(chatId);
  await ctx.answerCbQuery();
  await ctx.reply(`✅ Aapki complaint **bina proof ke** successfully submit ho chuki hai! Humari team jald hi is par action legi. Shukriya!`);
};