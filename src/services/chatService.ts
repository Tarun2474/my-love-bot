import { User } from '../models/User';
import { Match } from '../models/Match';

export class ChatService {
  static async endChat(telegramUserId: number, endedByUserId: number): Promise<{ partnerId: number; matchId: string; duration: number } | null> {
    const user = await User.findOne({ telegramUserId });
    if (!user || !user.partnerId || !user.activeMatchId) return null;

    const partnerId = user.partnerId;
    const matchId = user.activeMatchId;

    const match = await Match.findOne({ matchId, status: 'active' });
    let duration = 0;

    if (match) {
      match.status = 'ended';
      match.endedAt = new Date();
      match.endedBy = endedByUserId;
      duration = Math.floor((match.endedAt.getTime() - match.startedAt.getTime()) / 1000);
      match.durationSeconds = duration;
      await match.save();

      // Update both users total chat time and reset chat fields
      await User.updateMany(
        { telegramUserId: { $in: [telegramUserId, partnerId] } },
        {
          $set: { status: 'RATING', isSearching: false },
          $unset: { partnerId: 1, activeMatchId: 1 },
          $inc: { totalChatSeconds: duration }
        }
      );
    }

    return { partnerId, matchId, duration };
  }
}
