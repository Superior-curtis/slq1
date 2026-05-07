/**
 * Daily quest system
 */

import { nanoid } from "nanoid";

export interface DailyQuest {
  id: string;
  questType: "play_games" | "win_games" | "earn_points" | "correct_answers";
  questName: string;
  questDescription: string;
  targetValue: number;
  reward: number; // Points reward
  date: string; // YYYY-MM-DD
}

export interface UserQuestProgress {
  userId: number;
  questId: string;
  currentProgress: number;
  isCompleted: boolean;
  completedAt?: number;
}

const dailyQuests = new Map<string, DailyQuest>();
const userQuestProgress = new Map<string, UserQuestProgress>();

/**
 * Generate today's quests
 */
export function generateDailyQuests(): DailyQuest[] {
  const today = new Date().toISOString().split("T")[0];
  const questsKey = `quests_${today}`;

  // Check if quests already generated for today
  if (dailyQuests.has(questsKey)) {
    return Array.from(dailyQuests.values()).filter((q) => q.date === today);
  }

  const quests: DailyQuest[] = [
    {
      id: nanoid(),
      questType: "play_games",
      questName: "Game Master",
      questDescription: "Play 5 games today",
      targetValue: 5,
      reward: 100,
      date: today,
    },
    {
      id: nanoid(),
      questType: "win_games",
      questName: "Victory Seeker",
      questDescription: "Win 3 games today",
      targetValue: 3,
      reward: 200,
      date: today,
    },
    {
      id: nanoid(),
      questType: "earn_points",
      questName: "Point Collector",
      questDescription: "Earn 1000 points today",
      targetValue: 1000,
      reward: 150,
      date: today,
    },
    {
      id: nanoid(),
      questType: "correct_answers",
      questName: "Accuracy Master",
      questDescription: "Get 20 correct answers today",
      targetValue: 20,
      reward: 120,
      date: today,
    },
  ];

  quests.forEach((q) => dailyQuests.set(q.id, q));
  return quests;
}

/**
 * Get today's quests
 */
export function getTodayQuests(): DailyQuest[] {
  const today = new Date().toISOString().split("T")[0];
  return Array.from(dailyQuests.values()).filter((q) => q.date === today);
}

/**
 * Get user quest progress
 */
export function getUserQuestProgress(userId: number, questId: string): UserQuestProgress | null {
  const key = `${userId}_${questId}`;
  return userQuestProgress.get(key) || null;
}

/**
 * Update user quest progress
 */
export function updateQuestProgress(userId: number, questId: string, increment: number): UserQuestProgress {
  const key = `${userId}_${questId}`;
  const quest = dailyQuests.get(questId);

  if (!quest) {
    throw new Error(`Quest ${questId} not found`);
  }

  let progress = userQuestProgress.get(key);

  if (!progress) {
    progress = {
      userId,
      questId,
      currentProgress: 0,
      isCompleted: false,
    };
  }

  progress.currentProgress += increment;

  // Check if quest is completed
  if (progress.currentProgress >= quest.targetValue && !progress.isCompleted) {
    progress.isCompleted = true;
    progress.completedAt = Date.now();
  }

  userQuestProgress.set(key, progress);
  return progress;
}

/**
 * Get all user quest progress for today
 */
export function getUserTodayQuestProgress(userId: number): UserQuestProgress[] {
  const today = new Date().toISOString().split("T")[0];
  const todayQuests = Array.from(dailyQuests.values()).filter((q) => q.date === today);

  return todayQuests.map((q) => {
    const key = `${userId}_${q.id}`;
    return (
      userQuestProgress.get(key) || {
        userId,
        questId: q.id,
        currentProgress: 0,
        isCompleted: false,
      }
    );
  });
}

/**
 * Get total reward for completed quests
 */
export function getTotalQuestReward(userId: number): number {
  const today = new Date().toISOString().split("T")[0];
  const todayQuests = Array.from(dailyQuests.values()).filter((q) => q.date === today);

  let totalReward = 0;

  todayQuests.forEach((q) => {
    const key = `${userId}_${q.id}`;
    const progress = userQuestProgress.get(key);
    if (progress?.isCompleted) {
      totalReward += q.reward;
    }
  });

  return totalReward;
}

/**
 * Reset quests for new day
 */
export function resetDailyQuests(): void {
  const today = new Date().toISOString().split("T")[0];

  // Remove old quests
  Array.from(dailyQuests.entries()).forEach(([key, quest]) => {
    if (quest.date !== today) {
      dailyQuests.delete(key);
    }
  });

  // Remove old progress
  Array.from(userQuestProgress.entries()).forEach(([key, progress]) => {
    const questId = progress.questId;
    const quest = dailyQuests.get(questId);
    if (!quest || quest.date !== today) {
      userQuestProgress.delete(key);
    }
  });

  // Generate new quests
  generateDailyQuests();
}
