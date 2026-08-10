import { Context, Markup } from 'telegraf';
import { Complaint } from '../../models/Complaint';

type ComplaintSession = {
  step?: string;
  myUserIdInput?: string;
  reportedUserId?: string;
  issueDescription?: string;
  proofFileId?: string;
};

export const complaintSession = new Map<number, ComplaintSession>();

export const handleComplaintStart = async (ctx: Context) => {
  const welcomeText =
    `⚠️ *Welcome to My Love Bot Support & Complaints*\n\n` +
    `You can report any problem related to our bot or any user.\n\n` +
    `To submit a complaint, you need to provide:\n` +
    `• Your Telegram ID/Username\n` +
    `• Reported user's Telegram ID/Username\n` +
    `• Complaint details\n` +
    `• Proof if available`;

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

  if (data === 'btn_start_complaint') {
    complaintSession.set(userId, {
      step: 'ENTER_MY_ID'
    });

    await ctx.answerCbQuery();

    await ctx.reply(
      '👤 *Step 1/4*\n\nPlease enter your Telegram User ID or Username:',
      { parse_mode: 'Markdown' }
    );

    return;
  }

  if (data === 'proof_upload') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.answerCbQuery('Complaint session expired.');
      return;
    }

    session.step = 'WAIT_PROOF';
    complaintSession.set(userId, session);

    await ctx.answerCbQuery();

    await ctx.reply(
      '📎 Please upload your screenshot/proof now.\n\n' +
      'After uploading the proof, you will get a *Submit Complaint* button.',
      { parse_mode: 'Markdown' }
    );

    return;
  }

  if (data === 'proof_none') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.answerCbQuery('Complaint session expired.');
      return;
    }

    session.step = 'READY_TO_SUBMIT';
    complaintSession.set(userId, session);

    await ctx.answerCbQuery();

    await showSubmitButton(ctx);

    return;
  }

  if (data === 'submit_complaint') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.answerCbQuery('Complaint session expired.');
      return;
    }

    await ctx.answerCbQuery();

    await saveFinalComplaint(ctx, userId, session);

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

  if (session.step === 'ENTER_MY_ID') {
    session.myUserIdInput = text;
    session.step = 'ENTER_REPORTED_ID';

    complaintSession.set(userId, session);

    await ctx.reply(
      '🕵️ *Step 2/4*\n\nPlease enter the Telegram User ID or Username of the person you are reporting:',
      { parse_mode: 'Markdown' }
    );

    return true;
  }

  if (session.step === 'ENTER_REPORTED_ID') {
    session.reportedUserId = text;
    session.step = 'ENTER_ISSUE';

    complaintSession.set(userId, session);

    await ctx.reply(
      '✍️ *Step 3/4*\n\nPlease describe your complaint/problem in detail:',
      { parse_mode: 'Markdown' }
    );

    return true;
  }

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
      '📎 *Step 4/4*\n\nDo you have any proof/screenshot to attach?',
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

  if (!session || session.step !== 'WAIT_PROOF') {
    return false;
  }

  const message = ctx.message as any;

  const photos = message?.photo;

  if (!photos || photos.length === 0) {
    return false;
  }

  const largestPhoto = photos[photos.length - 1];

  session.proofFileId = largestPhoto.file_id;
  session.step = 'READY_TO_SUBMIT';

  complaintSession.set(userId, session);

  await ctx.reply(
    '✅ Proof uploaded successfully.\n\n' +
    'Your complaint is ready to submit.',
    {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '✅ Submit Complaint',
            'submit_complaint'
          )
        ]
      ])
    }
  );

  return true;
};

async function showSubmitButton(ctx: Context) {
  await ctx.reply(
    '✅ Your complaint is ready to submit.\n\nClick the button below to submit it.',
    {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '✅ Submit Complaint',
            'submit_complaint'
          )
        ]
      ])
    }
  );
}

async function saveFinalComplaint(
  ctx: Context,
  userId: number,
  session: ComplaintSession
) {
  const telegramUsername = ctx.from?.username
    ? `@${ctx.from.username}`
    : 'No Username';

  await Complaint.create({
    userId,
    username: telegramUsername,
    myUserIdInput: session.myUserIdInput,
    reportedUserId: session.reportedUserId,
    issueDescription: session.issueDescription,
    hasProof: !!session.proofFileId,
    proofFileId: session.proofFileId
  });

  complaintSession.delete(userId);

  await ctx.reply(
    '✅ *Complaint Submitted Successfully!*\n\n' +
    'Thank you for your report. Our support team will investigate the matter.',
    { parse_mode: 'Markdown' }
  );
}