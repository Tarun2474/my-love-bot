import { Context, Markup } from 'telegraf';
import { Complaint } from '../../models/Complaint';

type ComplaintSession = {
  step?: string;
  myUserIdInput?: string;
  reportedUserId?: string;
  issueDescription?: string;
  proofFileId?: string;
  hasProof?: boolean;
};

export const complaintSession = new Map<number, ComplaintSession>();

export const handleComplaintStart = async (ctx: Context) => {
  const welcomeText =
    `⚠️ *Welcome to My Love Bot Support & Complaints*\n\n` +
    `Aap My Love Bot, kisi user, ya kisi bhi problem ke regarding complaint kar sakte hain.\n\n` +
    `Complaint submit karne ke liye aapko:\n` +
    `• Apni Telegram ID\n` +
    `• Jis user ki complaint hai uski Telegram ID\n` +
    `• Complaint details\n` +
    `deni hogi.\n\n` +
    `Proof available ho to screenshot/photo bhi upload kar sakte hain.\n\n` +
    `👇 Complaint start karne ke liye button press karein:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📝 Start Complaint', 'btn_start_complaint')]
  ]);

  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    ...keyboard
  });
};


export const handleComplaintCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;

  if (!userId) return;

  await ctx.answerCbQuery();

  // START COMPLAINT
  if (data === 'btn_start_complaint') {
    complaintSession.set(userId, {
      step: 'ENTER_MY_ID'
    });

    await ctx.reply(
      `👤 *Step 1/4*\n\nApni Telegram User ID enter karein:`,
      { parse_mode: 'Markdown' }
    );

    return;
  }


  // UPLOAD PROOF
  if (data === 'proof_upload') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.reply('⚠️ Complaint session expire ho gaya. Please /complaint dobara start karein.');
      return;
    }

    session.step = 'WAIT_PROOF_UPLOAD';
    session.hasProof = true;

    complaintSession.set(userId, session);

    await ctx.reply(
      `📎 *Upload Proof*\n\n` +
      `Ab apna screenshot/photo upload karein.\n\n` +
      `Proof receive hone ke baad aapko complaint submit karne ka button milega.`,
      { parse_mode: 'Markdown' }
    );

    return;
  }


  // NO PROOF
  if (data === 'proof_none') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.reply('⚠️ Complaint session expire ho gaya. Please /complaint dobara start karein.');
      return;
    }

    session.hasProof = false;
    session.proofFileId = undefined;
    session.step = 'WAIT_SUBMIT';

    complaintSession.set(userId, session);

    const submitKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Submit Complaint', 'submit_complaint')]
    ]);

    await ctx.reply(
      `❌ *No Proof Selected*\n\n` +
      `Aap bina proof ke bhi complaint submit kar sakte hain.\n\n` +
      `Agar complaint details sahi hain to neeche button press karein:`,
      {
        parse_mode: 'Markdown',
        ...submitKeyboard
      }
    );

    return;
  }


  // SUBMIT COMPLAINT
  if (data === 'submit_complaint') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.reply(
        '⚠️ Complaint session expire ho gaya. Please /complaint dobara start karein.'
      );
      return;
    }

    if (
      !session.myUserIdInput ||
      !session.reportedUserId ||
      !session.issueDescription
    ) {
      await ctx.reply(
        '⚠️ Complaint information incomplete hai. Please /complaint dobara start karein.'
      );
      return;
    }

    await saveFinalComplaint(
      ctx,
      userId,
      session.myUserIdInput,
      session.reportedUserId,
      session.issueDescription,
      session.hasProof === true,
      session.proofFileId
    );

    return;
  }
};


export const handleComplaintText = async (
  ctx: Context
): Promise<boolean> => {

  const userId = ctx.from?.id;

  if (!userId) return false;

  const session = complaintSession.get(userId);

  if (!session || !session.step) return false;

  const text = (ctx.message as any)?.text?.trim();

  if (!text) return false;


  // STEP 1
  if (session.step === 'ENTER_MY_ID') {

    session.myUserIdInput = text;
    session.step = 'ENTER_REPORTED_ID';

    complaintSession.set(userId, session);

    await ctx.reply(
      `🕵️ *Step 2/4*\n\n` +
      `Jis user ki complaint karni hai uski Telegram User ID enter karein:`,
      { parse_mode: 'Markdown' }
    );

    return true;
  }


  // STEP 2
  if (session.step === 'ENTER_REPORTED_ID') {

    session.reportedUserId = text;
    session.step = 'ENTER_ISSUE';

    complaintSession.set(userId, session);

    await ctx.reply(
      `✍️ *Step 3/4*\n\n` +
      `Apni complaint/problem ko detail mein describe karein:`,
      { parse_mode: 'Markdown' }
    );

    return true;
  }


  // STEP 3
  if (session.step === 'ENTER_ISSUE') {

    session.issueDescription = text;
    session.step = 'WAIT_PROOF_CHOICE';

    complaintSession.set(userId, session);

    const proofKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          '📎 Upload Proof',
          'proof_upload'
        ),
        Markup.button.callback(
          '❌ I Have No Proof',
          'proof_none'
        )
      ]
    ]);

    await ctx.reply(
      `📎 *Step 4/4*\n\n` +
      `Kya aapke paas complaint ka proof hai?\n\n` +
      `Agar screenshot/photo hai to Upload Proof select karein.\n` +
      `Agar proof nahi hai to I Have No Proof select karein.`,
      {
        parse_mode: 'Markdown',
        ...proofKeyboard
      }
    );

    return true;
  }

  return false;
};


export const handleComplaintPhoto = async (
  ctx: Context
): Promise<boolean> => {

  const userId = ctx.from?.id;

  if (!userId) return false;

  const session = complaintSession.get(userId);

  if (
    !session ||
    session.step !== 'WAIT_PROOF_UPLOAD'
  ) {
    return false;
  }

  const photo = (ctx.message as any)?.photo;

  if (!photo || photo.length === 0) {
    return false;
  }

  // Highest resolution photo
  const largestPhoto = photo[photo.length - 1];

  session.proofFileId = largestPhoto.file_id;
  session.hasProof = true;
  session.step = 'WAIT_SUBMIT';

  complaintSession.set(userId, session);

  const submitKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Submit Complaint', 'submit_complaint')]
  ]);

  await ctx.reply(
    `✅ *Proof received successfully!*\n\n` +
    `Ab aap apni complaint submit kar sakte hain.`,
    {
      parse_mode: 'Markdown',
      ...submitKeyboard
    }
  );

  return true;
};


async function saveFinalComplaint(
  ctx: Context,
  userId: number,
  myUserIdInput: string,
  reportedUserId: string,
  issueDescription: string,
  hasProof: boolean,
  proofFileId?: string
) {

  const telegramUsername = ctx.from?.username
    ? `@${ctx.from.username}`
    : 'No Username';

  await Complaint.create({
    userId,
    username: telegramUsername,
    reportedUserId,
    issueDescription,
    hasProof,
    proofFileId
  });

  complaintSession.delete(userId);

  await ctx.reply(
    `✅ *Complaint Submitted Successfully!*\n\n` +
    `Thank you for your report.\n\n` +
    `Our support team will investigate the matter.\n\n` +
    `📌 Complaint automatically archive/remove ho jayegi after 7 days.`,
    { parse_mode: 'Markdown' }
  );
}