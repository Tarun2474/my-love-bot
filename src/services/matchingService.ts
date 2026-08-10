import { User, IUser } from '../models/User';
import { Match, IMatch } from '../models/Match';
import crypto from 'crypto';

export class MatchingService {
  static async findMatch(user: IUser): Promise<IMatch | null> {
    try {
      // Build query based on user's filter or preference
      const query: any = {
        telegramUserId: { $ne: user.telegramUserId },
        status: 'SEARCHING',
        isSearching: true,
        isAdult: true,
        deletedAt: { $exists: false }
      };

      // Handle gender filtering
      if (user.filterGender && user.filterGender !== 'ALL') {
        query.gender = user.filterGender;
      } else {
        // Default preference logic
        if (user.gender === 'Male') query.gender = 'Female';
        else if (user.gender === 'Female') query.gender = 'Male';
      }

      // First try preferred match
      let partner = await User.findOneAndUpdate(
        query,
        { $set: { status: 'CHATTING', isSearching: false, partnerId: user.telegramUserId } },
        { sort: { createdAt: 1 } }
      );

      // If preferred not found, fallback to any available searching user
      if (!partner) {
        delete query.gender;
        partner = await User.findOneAndUpdate(
          query,
          { $set: { status: 'CHATTING', isSearching: false, partnerId: user.telegramUserId } },
          { sort: { createdAt: 1 } }
        );
      }

      if (!partner) {
        return null;
      }

      // Update current searching user
      await User.updateOne(
        { telegramUserId: user.telegramUserId },
        { $set: { status: 'CHATTING', isSearching: false, partnerId: partner.telegramUserId } }
      );

      // Create Match Record
      const matchId = 'MATCH_' + crypto.randomBytes(6).toString('hex');
      const newMatch = await Match.create({
        matchId,
        user1: user.telegramUserId,
        user2: partner.telegramUserId,
        status: 'active',
        startedAt: new Date()
      });

      // Update both users with activeMatchId
      await User.updateMany(
        { telegramUserId: { $in: [user.telegramUserId, partner.telegramUserId] } },
        { $set: { activeMatchId: matchId } }
      );

      return newMatch;
    } catch (error) {
      console.error('Matching Error:', error);
      return null;
    }
  }
}
