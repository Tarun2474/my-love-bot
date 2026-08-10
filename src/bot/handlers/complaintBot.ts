import { Context, Markup } from 'telegraf';
import { Complaint } from '../../models/Complaint';

export const complaintSession = new Map<number, { 
  step?: string; 
  myUserIdInput?: string; 
  reportedUserId?: string; 
  issueDescription?: string 
}>();

export const handleComplaintStart = async (ctx: Context) => {
  const welcomeText = `⚠️ **Welcome to My Love Bot Support & Complaints**\n\nYou can report any issues here if you face any trouble with our bot or with any user.\n\nTo submit a complaint, you must provide your ID, the reported user's ID, and valid details. Click the button below to start:`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Complaint', 'btn_start_complaint')]
  ]);

  await ctx.reply(welcomeText, keyboard);
};

export const handleComplaintCallbacks = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;

  if (data === 'btn_start_complaint') {
    complaintSession.set(userId, { step: 'ENTER_MY_ID' });
    await ctx.answerCbQuery();
    await ctx.reply('👤 Step 1/3: Please enter **your User ID** or Username:');
  } else if (data === 'proof_upload') {
    await ctx.answerCbQuery();
    await ctx.reply('🖼 Please upload your screenshot or proof image now:');
  } else if (data === 'proof_none') {
    await ctx.answerCbQuery();
    const session = complaintSession.get(userId);
    if (!session) return;

    await saveFinalComplaint(ctx, userId, session.myUserIdInput!, session.reportedUserId!, session.issueDescription!, false);
  }
};

export const handleComplaintText = async (ctx: Context): Promise<boolean> => {
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
    await ctx.reply('🕵️ Step 2/3: Please enter the **User ID or Username of the person** you are reporting:');
    return true;
  }

  if (session.step === 'ENTER_REPORTED_ID') {
    session.reportedUserId = text;
    session.step = 'ENTER_ISSUE';
    complaintSession.set(userId, session);
    await ctx.reply('✍️ Step 3/3: Please describe your problem or complaint in detail:');
    return true;
  }

  if (session.step === 'ENTER_ISSUE') {
    session.issueDescription = text;
    session.step = 'WAIT_PROOF_CHOICE';
    complaintSession.set(userId, session);

    const proofKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('Upload Proof', 'proof_upload')],
      [Markup.button.callback('I Have No Proof', 'proof_none')]
    ]);

    await ctx.reply('📎 Do you have any proof (screenshot) to attach with your complaint?', proofKeyboard);
    return true;
  }

  return false;
};

export const handleComplaintPhoto = async (ctx: Context): Promise<boolean> => {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const session = complaintSession.get(userId);
  if (!session || session.step !== 'WAIT_PROOF_CHOICE') return false;

  await saveFinalComplaint(ctx, userId, session.myUserIdInput!, session.reportedUserId!, session.issueDescription!, true);
  return true;
};

async function saveFinalComplaint(ctx: Context, userId: number, myUserIdInput: string, reportedUserId: string, issueDescription: string, hasProof: boolean) {
  const telegramUsername = ctx.from?.username ? `@${ctx.from.username}` : 'No Username';

  await Complaint.create({
    userId,
    username: telegramUsername,
    reportedUserId,
    issueDescription,
    hasProof
  });

  complaintSession.delete(userId);

  await ctx.reply('✅ **Complaint Submitted Successfully!**\n\nThank you for your report. Our support team will investigate the matter. Note: Complaints are automatically archived and removed after 7 days.');
}