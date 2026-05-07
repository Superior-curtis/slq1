/**
 * Bot AI system for playing against human players
 */

import { nanoid } from "nanoid";

export interface BotPlayer {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  accuracy: number; // 0-100
  responseTime: number; // ms
  totalWins: number;
  totalGames: number;
}

const BOT_NAMES = [
  "AlphaBot",
  "NeuralNet",
  "CyberMind",
  "QuantumBot",
  "ShadowBot",
  "PhantomAI",
  "VortexBot",
  "NovaAI",
  "ZenithBot",
  "ApexBot",
];

const DIFFICULTY_SETTINGS = {
  easy: {
    accuracy: 40,
    responseTime: [2000, 4000],
  },
  medium: {
    accuracy: 60,
    responseTime: [1000, 2500],
  },
  hard: {
    accuracy: 80,
    responseTime: [500, 1500],
  },
  expert: {
    accuracy: 95,
    responseTime: [200, 800],
  },
};

/**
 * Create a bot player
 */
export function createBotPlayer(difficulty: "easy" | "medium" | "hard" | "expert" = "medium"): BotPlayer {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

  return {
    id: nanoid(),
    name: `${randomName} (Bot)`,
    difficulty,
    accuracy: settings.accuracy,
    responseTime: Math.floor(Math.random() * (settings.responseTime[1] - settings.responseTime[0])) + settings.responseTime[0],
    totalWins: 0,
    totalGames: 0,
  };
}

/**
 * Simulate bot answer to a question
 */
export function getBotAnswer(correctAnswers: string[], bot: BotPlayer): { answer: string; responseTime: number; isCorrect: boolean } {
  // Simulate response time
  const responseTime = bot.responseTime + Math.floor(Math.random() * 500 - 250);

  // Determine if bot answers correctly based on accuracy
  const isCorrect = Math.random() * 100 < bot.accuracy;

  let answer: string;
  if (isCorrect && correctAnswers.length > 0) {
    // Pick a correct answer
    answer = correctAnswers[Math.floor(Math.random() * correctAnswers.length)];
  } else {
    // Generate a wrong answer
    answer = `Wrong_${Math.floor(Math.random() * 10000)}`;
  }

  return {
    answer,
    responseTime: Math.max(100, responseTime),
    isCorrect,
  };
}

/**
 * Calculate bot score
 */
export function calculateBotScore(responseTime: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;

  // Base score: 1000 points
  // Deduct 1 point per 100ms (max deduction 500 points)
  const timeDeduction = Math.min(500, Math.floor(responseTime / 100));
  return Math.max(100, 1000 - timeDeduction);
}

/**
 * Update bot statistics
 */
export function updateBotStats(bot: BotPlayer, won: boolean): BotPlayer {
  return {
    ...bot,
    totalGames: bot.totalGames + 1,
    totalWins: bot.totalWins + (won ? 1 : 0),
  };
}

/**
 * Get bot win rate
 */
export function getBotWinRate(bot: BotPlayer): number {
  if (bot.totalGames === 0) return 0;
  return (bot.totalWins / bot.totalGames) * 100;
}
