import { Badge, UserStats, BadgeRarity } from '../types';
import { getFriendsList } from './friendsStorage';

const BADGE_DEFINITIONS: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: 'streak' | 'battle' | 'study' | 'social';
  targetValue: number;
  badgeTag: string;
  checkUnlocked: (stats: UserStats) => { current: number; unlocked: boolean };
}> = [
  {
    id: 'first_question',
    name: 'Tân Binh Dịch Thuật',
    description: 'Hoàn thành câu dịch tiếng Anh đầu tiên',
    icon: '🌟',
    rarity: 'common',
    category: 'study',
    targetValue: 1,
    badgeTag: 'Khởi đầu mới',
    checkUnlocked: (stats) => ({
      current: stats.totalQuestionsCompleted,
      unlocked: stats.totalQuestionsCompleted >= 1,
    }),
  },
  {
    id: 'streak_3',
    name: 'Khởi Đầu Kiên Trì',
    description: 'Học bài và duy trì chuỗi 3 ngày liên tiếp',
    icon: '🌱',
    rarity: 'common',
    category: 'streak',
    targetValue: 3,
    badgeTag: 'Chuỗi 3 ngày',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.consecutiveDays, 3),
      unlocked: stats.consecutiveDays >= 3,
    }),
  },
  {
    id: 'streak_7',
    name: 'Người Dịch Chăm Chỉ',
    description: 'Học bài và duy trì chuỗi 7 ngày liên tiếp',
    icon: '🔥',
    rarity: 'epic',
    category: 'streak',
    targetValue: 7,
    badgeTag: 'Chuỗi 7 ngày',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.consecutiveDays, 7),
      unlocked: stats.consecutiveDays >= 7,
    }),
  },
  {
    id: 'duel_10_wins',
    name: 'Thánh Dịch',
    description: 'Thắng 10 trận đấu trong Đấu Trường 1v1 Song Song',
    icon: '👑',
    rarity: 'legendary',
    category: 'battle',
    targetValue: 10,
    badgeTag: '10 trận thắng 1v1',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.duelWins, 10),
      unlocked: stats.duelWins >= 10,
    }),
  },
  {
    id: 'study_30_questions',
    name: 'Học Giả Siêng Năng',
    description: 'Hoàn thành 30 câu dịch giao tiếp thực tế',
    icon: '📚',
    rarity: 'rare',
    category: 'study',
    targetValue: 30,
    badgeTag: '30 câu dịch',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.totalQuestionsCompleted, 30),
      unlocked: stats.totalQuestionsCompleted >= 30,
    }),
  },
  {
    id: 'tower_boss',
    name: 'Dũng Sĩ Diệt Quái',
    description: 'Vượt qua ít nhất 3 tầng trong Tháp Ma Vương',
    icon: '⚔️',
    rarity: 'rare',
    category: 'battle',
    targetValue: 3,
    badgeTag: 'Tầng 3 Tháp',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.towerFloorsCleared, 3),
      unlocked: stats.towerFloorsCleared >= 3,
    }),
  },
  {
    id: 'friends_3',
    name: 'Bằng Hữu Bốn Phương',
    description: 'Kết bạn với 3 người bạn qua Gmail trên trang',
    icon: '🤝',
    rarity: 'rare',
    category: 'social',
    targetValue: 3,
    badgeTag: '3 bạn bè Gmail',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.friendsCount, 3),
      unlocked: stats.friendsCount >= 3,
    }),
  },
  {
    id: 'words_lookup_10',
    name: 'Chuyên Gia Từ Vựng',
    description: 'Tra từ hoặc học từ vựng chuyên sâu 10 lần',
    icon: '🎯',
    rarity: 'common',
    category: 'study',
    targetValue: 10,
    badgeTag: '10 lần tra từ',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.wordsLookedUpCount, 10),
      unlocked: stats.wordsLookedUpCount >= 10,
    }),
  },
  {
    id: 'study_100_questions',
    name: 'Bậc Thầy Ngôn Ngữ',
    description: 'Hoàn thành 100 câu dịch tiếng Anh xuất sắc',
    icon: '🎓',
    rarity: 'legendary',
    category: 'study',
    targetValue: 100,
    badgeTag: '100 câu dịch',
    checkUnlocked: (stats) => ({
      current: Math.min(stats.totalQuestionsCompleted, 100),
      unlocked: stats.totalQuestionsCompleted >= 100,
    }),
  },
];

function getStatsStorageKey(userEmail?: string): string {
  const normalized = (userEmail || 'guest').toLowerCase().trim();
  return `app_user_stats_${normalized}`;
}

/**
 * Tính số ngày học liên tiếp chuẩn xác dựa trên lịch sử các ngày học
 */
export function calculateStreakFromDates(dates: string[]): number {
  if (!dates || dates.length === 0) return 0;

  const uniqueSortedDates = Array.from(new Set(dates)).sort().reverse();
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const firstDate = uniqueSortedDates[0];
  // Nếu ngày gần nhất không phải hôm nay và không phải hôm qua thì chuỗi đã bị đứt
  if (firstDate !== todayStr && firstDate !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  let currentDate = new Date(firstDate);

  for (let i = 1; i < uniqueSortedDates.length; i++) {
    const prevDate = new Date(uniqueSortedDates[i]);
    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

export function getUserStats(userEmail?: string): UserStats {
  const key = getStatsStorageKey(userEmail);
  const today = new Date().toISOString().split('T')[0];

  let stats: UserStats = {
    consecutiveDays: 0,
    lastStudyDate: '',
    studyDates: [],
    totalQuestionsCompleted: 0,
    duelWins: 0,
    towerFloorsCleared: 0,
    wordsLookedUpCount: 0,
    friendsCount: 0,
    unlockedBadgeIds: [],
  };

  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      stats = { ...stats, ...JSON.parse(saved) };
    }

    // Đếm số bạn bè thực tế từ friendsStorage
    const friends = getFriendsList(userEmail);
    stats.friendsCount = Math.max(stats.friendsCount, friends.length);

    // Đồng bộ số câu đã làm từ daily_study_count
    const todayCountStr = localStorage.getItem(`daily_study_count_${today}`);
    if (todayCountStr) {
      const todayNum = parseInt(todayCountStr, 10) || 0;
      if (todayNum > 0 && !stats.studyDates.includes(today)) {
        stats.studyDates = [today, ...stats.studyDates];
      }
      stats.totalQuestionsCompleted = Math.max(stats.totalQuestionsCompleted, todayNum);
    }

    // Đọc số trận thắng 1v1 đã lưu
    const savedDuelWins = localStorage.getItem('duel_wins_count');
    if (savedDuelWins) {
      stats.duelWins = Math.max(stats.duelWins, parseInt(savedDuelWins, 10) || 0);
    }

    // Đọc số tầng tháp đã vượt
    const savedTowerCoins = localStorage.getItem('tower_battle_coins');
    if (savedTowerCoins) {
      stats.towerFloorsCleared = Math.max(stats.towerFloorsCleared, 1);
    }

    // Tính lại chuỗi ngày học liên tục
    stats.consecutiveDays = calculateStreakFromDates(stats.studyDates);
  } catch (e) {}

  return stats;
}

export function saveUserStats(stats: UserStats, userEmail?: string): void {
  try {
    const key = getStatsStorageKey(userEmail);
    localStorage.setItem(key, JSON.stringify(stats));
  } catch (e) {}
}

export function calculateBadges(stats: UserStats): Badge[] {
  return BADGE_DEFINITIONS.map((def) => {
    const { current, unlocked } = def.checkUnlocked(stats);
    const wasAlreadyUnlocked = stats.unlockedBadgeIds.includes(def.id);
    const isUnlocked = unlocked || wasAlreadyUnlocked;

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      rarity: def.rarity,
      category: def.category,
      currentValue: current,
      targetValue: def.targetValue,
      isUnlocked,
      badgeTag: def.badgeTag,
      unlockedAt: wasAlreadyUnlocked ? new Date().toISOString() : undefined,
    };
  });
}

function checkAndUnlockBadges(
  stats: UserStats,
  userEmail?: string
): { stats: UserStats; newlyUnlocked: Badge[] } {
  const allBadges = calculateBadges(stats);
  const newlyUnlocked: Badge[] = [];
  const currentUnlockedSet = new Set(stats.unlockedBadgeIds);

  for (const b of allBadges) {
    if (b.isUnlocked && !currentUnlockedSet.has(b.id)) {
      currentUnlockedSet.add(b.id);
      newlyUnlocked.push(b);
    }
  }

  const updatedStats: UserStats = {
    ...stats,
    unlockedBadgeIds: Array.from(currentUnlockedSet),
  };

  saveUserStats(updatedStats, userEmail);
  return { stats: updatedStats, newlyUnlocked };
}

/**
 * Ghi nhận khi học viên làm đúng 1 câu dịch
 */
export function recordQuestionCompleted(userEmail?: string): {
  stats: UserStats;
  newlyUnlocked: Badge[];
} {
  const stats = getUserStats(userEmail);
  const today = new Date().toISOString().split('T')[0];

  const updatedDates = stats.studyDates.includes(today)
    ? stats.studyDates
    : [today, ...stats.studyDates];

  const consecutive = calculateStreakFromDates(updatedDates);

  const newStats: UserStats = {
    ...stats,
    studyDates: updatedDates,
    lastStudyDate: today,
    consecutiveDays: consecutive,
    totalQuestionsCompleted: stats.totalQuestionsCompleted + 1,
  };

  return checkAndUnlockBadges(newStats, userEmail);
}

/**
 * Ghi nhận khi học viên chiến thắng 1 trận trong Đấu Trường 1v1
 */
export function recordDuelWin(userEmail?: string): {
  stats: UserStats;
  newlyUnlocked: Badge[];
} {
  const stats = getUserStats(userEmail);
  const newWins = stats.duelWins + 1;
  try {
    localStorage.setItem('duel_wins_count', newWins.toString());
  } catch (e) {}

  const newStats: UserStats = {
    ...stats,
    duelWins: newWins,
  };

  return checkAndUnlockBadges(newStats, userEmail);
}

/**
 * Ghi nhận khi học viên vượt qua tầng Tháp Ma Vương
 */
export function recordTowerFloorCleared(
  floorIndex: number,
  userEmail?: string
): { stats: UserStats; newlyUnlocked: Badge[] } {
  const stats = getUserStats(userEmail);
  const newFloors = Math.max(stats.towerFloorsCleared, floorIndex + 1);

  const newStats: UserStats = {
    ...stats,
    towerFloorsCleared: newFloors,
  };

  return checkAndUnlockBadges(newStats, userEmail);
}

/**
 * Ghi nhận khi học viên tra từ vựng
 */
export function recordWordLookup(userEmail?: string): {
  stats: UserStats;
  newlyUnlocked: Badge[];
} {
  const stats = getUserStats(userEmail);
  const newStats: UserStats = {
    ...stats,
    wordsLookedUpCount: stats.wordsLookedUpCount + 1,
  };

  return checkAndUnlockBadges(newStats, userEmail);
}

/**
 * Cập nhật số bạn bè cho huy hiệu
 */
export function syncFriendsCount(
  count: number,
  userEmail?: string
): { stats: UserStats; newlyUnlocked: Badge[] } {
  const stats = getUserStats(userEmail);
  const newStats: UserStats = {
    ...stats,
    friendsCount: Math.max(stats.friendsCount, count),
  };

  return checkAndUnlockBadges(newStats, userEmail);
}
