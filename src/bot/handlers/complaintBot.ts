import { Context, Markup } from 'telegraf';
import { Complaint } from '../../models/Complaint';

interface ComplaintSession {
  step?: string;
  myUserIdInput?: string;
  reportedUserId?: string;
  complaintType?: string;
  issueDescription?: string;
  hasProof?: boolean;
  proofFileId?: string;
  proofType?: 'photo' | 'document';
}

export const complaintSession = new Map<number, ComplaintSession>();


// ==========================================
// START COMPLAINT
// ==========================================

export const handleComplaintStart = async (ctx: Context) => {
  const welcomeText =
    `⚠️ *Welcome to My Love Bot Support & Complaints*\n\n` +
    `Aap humare bot, service ya kisi user se related problem ki complaint kar sakte hain.\n\n` +
    `Complaint submit karne ke liye aapko apni Telegram ID aur jis user ki complaint karni hai uski Telegram ID deni hogi.\n\n` +
    `Agar available ho to complaint ka proof bhi upload kar sakte hain, jaise screenshot.\n\n` +
    `Complaint start karne ke liye neeche button par click karein.`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '📢 Start Complaint',
        'btn_start_complaint'
      )
    ]
  ]);

  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    ...keyboard
  });
};


// ==========================================
// CALLBACK BUTTONS
// ==========================================

export const handleComplaintCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    return;
  }

  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;

  if (!userId) return;

  // ----------------------------------------
  // START COMPLAINT
  // ----------------------------------------

  if (data === 'btn_start_complaint') {
    complaintSession.set(userId, {
      step: 'ENTER_MY_ID'
    });

    await ctx.answerCbQuery();

    await ctx.reply(
      '👤 *Step 1/5*\n\nPlease enter *your Telegram User ID*:',
      {
        parse_mode: 'Markdown'
      }
    );

    return;
  }


  // ----------------------------------------
  // UPLOAD PROOF
  // ----------------------------------------

  if (data === 'proof_upload') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.answerCbQuery('Complaint session expired.');
      return;
    }

    session.step = 'WAITING_FOR_PROOF';
    session.hasProof = true;

    complaintSession.set(userId, session);

    await ctx.answerCbQuery();

    await ctx.reply(
      '📎 *Upload Proof*\n\n' +
      'Please send your screenshot or proof image now.\n\n' +
      'After uploading the proof, I will ask you for the complaint details.',
      {
        parse_mode: 'Markdown'
      }
    );

    return;
  }


  // ----------------------------------------
  // NO PROOF
  // ----------------------------------------

  if (data === 'proof_none') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.answerCbQuery('Complaint session expired.');
      return;
    }

    session.hasProof = false;
    session.step = 'ENTER_ISSUE';

    complaintSession.set(userId, session);

    await ctx.answerCbQuery();

    await ctx.reply(
      '📝 *Complaint Details*\n\n' +
      'Please describe your complaint in detail.\n\n' +
      'Aapke saath kya problem hui, kab hui aur kis user/bot se related hai — sab details likhein.',
      {
        parse_mode: 'Markdown'
      }
    );

    return;
  }


  // ----------------------------------------
  // SUBMIT COMPLAINT
  // ----------------------------------------

  if (data === 'submit_complaint') {
    const session = complaintSession.get(userId);

    if (!session) {
      await ctx.answerCbQuery('Complaint session expired.');
      return;
    }

    if (
      !session.myUserIdInput ||
      !session.reportedUserId ||
      !session.complaintType ||
      !session.issueDescription
    ) {
      await ctx.answerCbQuery(
        'Please complete all complaint details first.'
      );
      return;
    }

    await ctx.answerCbQuery();

    await saveFinalComplaint(
      ctx,
      userId,
      session
    );

    return;
  }


  // ----------------------------------------
  // CANCEL COMPLAINT
  // ----------------------------------------

  if (data === 'cancel_complaint') {
    complaintSession.delete(userId);

    await ctx.answerCbQuery();

    await ctx.reply(
      '❌ Complaint cancelled.\n\nYou can submit a new complaint anytime using Contact Us.'
    );

    return;
  }
};


// ==========================================
// TEXT HANDLER
// ==========================================

export const handleComplaintText = async (
  ctx: Context
): Promise<boolean> => {

  const userId = ctx.from?.id;

  if (!userId) return false;

  const session = complaintSession.get(userId);

  if (!session || !session.step) {
    return false;
  }

  const text = (ctx.message as any)?.text?.trim();

  if (!text) {
    return false;
  }


  // ----------------------------------------
  // STEP 1 - MY ID
  // ----------------------------------------

  if (session.step === 'ENTER_MY_ID') {

    session.myUserIdInput = text;
    session.step = 'ENTER_REPORTED_ID';

    complaintSession.set(userId, session);

    await ctx.reply(
      '👤 *Step 2/5*\n\n' +
      'Please enter the *Telegram User ID* of the person you are reporting:',
      {
        parse_mode: 'Markdown'
      }
    );

    return true;
  }


  // ----------------------------------------
  // STEP 2 - REPORTED USER ID
  // ----------------------------------------

  if (session.step === 'ENTER_REPORTED_ID') {

    session.reportedUserId = text;
    session.step = 'ENTER_COMPLAINT_TYPE';

    complaintSession.set(userId, session);

    await ctx.reply(
      '📂 *Step 3/5*\n\n' +
      'Please enter the *Complaint Type*.\n\n' +
      'Example:\n' +
      '• Harassment\n' +
      '• Abuse\n' +
      '• Fake Profile\n' +
      '• Scam/Fraud\n' +
      '• Inappropriate Behaviour\n' +
      '• Bot Problem\n' +
      '• Other',
      {
        parse_mode: 'Markdown'
      }
    );

    return true;
  }


  // ----------------------------------------
  // STEP 3 - COMPLAINT TYPE
  // ----------------------------------------

  if (session.step === 'ENTER_COMPLAINT_TYPE') {

    session.complaintType = text;
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
      '📎 *Step 4/5 — Proof*\n\n' +
      'Do you have any proof such as a screenshot?\n\n' +
      'Proof available hai to *Upload Proof* select karein.\n' +
      'Agar proof nahi hai to *I Have No Proof* select karein.',
      {
        parse_mode: 'Markdown',
        ...proofKeyboard
      }
    );

    return true;
  }


  // ----------------------------------------
  // STEP 4 - COMPLAINT DETAILS
  // ----------------------------------------

  if (session.step === 'ENTER_ISSUE') {

    session.issueDescription = text;
    session.step = 'CONFIRM_COMPLAINT';

    complaintSession.set(userId, session);

    const confirmKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          '✅ Submit Complaint',
          'submit_complaint'
        )
      ],
      [
        Markup.button.callback(
          '❌ Cancel',
          'cancel_complaint'
        )
      ]
    ]);

    await ctx.reply(
      '📋 *Step 5/5 — Review*\n\n' +
      `👤 Your ID: ${session.myUserIdInput}\n` +
      `🕵️ Reported User ID: ${session.reportedUserId}\n` +
      `📂 Complaint Type: ${session.complaintType}\n` +
      `📎 Proof: ${session.hasProof ? 'Yes' : 'No'}\n\n` +
      `📝 Complaint Details:\n${session.issueDescription}\n\n` +
      `Agar sab information correct hai to *Submit Complaint* par click karein.`,
      {
        parse_mode: 'Markdown',
        ...confirmKeyboard
      }
    );

    return true;
  }

  return false;
};


// ==========================================
// PHOTO / SCREENSHOT HANDLER
// ==========================================

export const handleComplaintPhoto = async (
  ctx: Context
): Promise<boolean> => {

  const userId = ctx.from?.id;

  if (!userId) return false;

  const session = complaintSession.get(userId);

  if (
    !session ||
    session.step !== 'WAITING_FOR_PROOF'
  ) {
    return false;
  }

  const message = ctx.message as any;

  if (!message?.photo || message.photo.length === 0) {
    return false;
  }

  const largestPhoto =
    message.photo[message.photo.length - 1];

  session.proofFileId = largestPhoto.file_id;
  session.proofType = 'photo';
  session.hasProof = true;

  session.step = 'ENTER_ISSUE';

  complaintSession.set(userId, session);

  await ctx.reply(
    '✅ Proof received successfully!\n\n' +
    '📝 Now please describe your complaint in detail.\n\n' +
    'Aapke saath kya problem hui, kab hui aur kis user/bot se related hai — sab details likhein.'
  );

  return true;
};


// ==========================================
// SAVE COMPLAINT
// ==========================================

async function saveFinalComplaint(
  ctx: Context,
  userId: number,
  session: ComplaintSession
) {

  const telegramUsername =
    ctx.from?.username
      ? `@${ctx.from.username}`
      : 'No Username';


  await Complaint.create({

    userId,

    username: telegramUsername,

    myUserIdInput:
      session.myUserIdInput!,

    reportedUserId:
      session.reportedUserId!,

    complaintType:
      session.complaintType!,

    issueDescription:
      session.issueDescription!,

    hasProof:
      session.hasProof ?? false,

    proofFileId:
      session.proofFileId,

    proofType:
      session.proofType
  });


  complaintSession.delete(userId);


  await ctx.reply(
    '✅ *Complaint Submitted Successfully!*\n\n' +
    'Thank you for your report. Our support team will investigate the matter.\n\n' +
    'Your complaint has been securely recorded.\n\n' +
    '⏳ Complaints are automatically archived and removed after 7 days.',
    {
      parse_mode: 'Markdown'
    }
  );
}