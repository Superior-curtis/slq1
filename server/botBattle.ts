import { invokeLLM } from "./_core/llm";

/**
 * 機器人對戰系統
 */

export type BotDifficulty = "easy" | "medium" | "hard" | "expert";

interface BotPlayer {
  id: string;
  name: string;
  difficulty: BotDifficulty;
  accuracy: number; // 0-100
  speed: number; // 毫秒
  score: number;
  wins: number;
  losses: number;
}

interface BotAnswer {
  answer: string;
  confidence: number; // 0-100
  responseTime: number; // 毫秒
}

/**
 * 建立機器人玩家
 */
export function createBotPlayer(difficulty: BotDifficulty): BotPlayer {
  const botNames = [
    "Bot_Alpha",
    "Bot_Beta",
    "Bot_Gamma",
    "Bot_Delta",
    "Bot_Epsilon",
    "Bot_Zeta",
    "Bot_Eta",
    "Bot_Theta",
  ];

  const randomName = botNames[Math.floor(Math.random() * botNames.length)];

  const difficultyStats = {
    easy: {
      accuracy: 40 + Math.random() * 20, // 40-60%
      speed: 3000 + Math.random() * 2000, // 3-5 秒
    },
    medium: {
      accuracy: 60 + Math.random() * 20, // 60-80%
      speed: 2000 + Math.random() * 1000, // 2-3 秒
    },
    hard: {
      accuracy: 80 + Math.random() * 15, // 80-95%
      speed: 1000 + Math.random() * 500, // 1-1.5 秒
    },
    expert: {
      accuracy: 95 + Math.random() * 5, // 95-100%
      speed: 500 + Math.random() * 300, // 0.5-0.8 秒
    },
  };

  const stats = difficultyStats[difficulty];

  return {
    id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: randomName,
    difficulty,
    accuracy: stats.accuracy,
    speed: stats.speed,
    score: 0,
    wins: 0,
    losses: 0,
  };
}

/**
 * 機器人生成答案
 */
export async function generateBotAnswer(
  question: string,
  options: string[],
  bot: BotPlayer
): Promise<BotAnswer> {
  try {
    // 根據難度決定答案策略
    const shouldBeCorrect = Math.random() * 100 < bot.accuracy;

    let answer: string;
    let confidence: number;

    if (shouldBeCorrect) {
      // 正確答案（假設第一個選項是正確答案）
      answer = options[0];
      confidence = 80 + Math.random() * 20;
    } else {
      // 錯誤答案
      const wrongOptions = options.slice(1);
      answer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      confidence = 40 + Math.random() * 40;
    }

    // 根據難度調整響應時間
    const responseTime = Math.max(
      100,
      bot.speed + (Math.random() - 0.5) * bot.speed * 0.2
    );

    return {
      answer,
      confidence,
      responseTime: Math.round(responseTime),
    };
  } catch (error) {
    console.error("[Bot Battle] Failed to generate answer:", error);
    return {
      answer: options[Math.floor(Math.random() * options.length)],
      confidence: 50,
      responseTime: bot.speed,
    };
  }
}

/**
 * 計算機器人得分
 */
export function calculateBotScore(
  isCorrect: boolean,
  responseTime: number,
  maxTime: number = 30000
): number {
  if (!isCorrect) return 0;

  // 基礎分數
  const baseScore = 1000;

  // 時間獎勵（越快越多分）
  const timeBonus = Math.max(0, baseScore * (1 - responseTime / maxTime));

  return Math.round(baseScore + timeBonus);
}

/**
 * 模擬機器人對戰
 */
export async function simulateBotBattle(
  playerScore: number,
  playerResponseTime: number,
  botDifficulty: BotDifficulty,
  isPlayerCorrect: boolean
): Promise<{
  bot: BotPlayer;
  botScore: number;
  playerWins: boolean;
  details: string;
}> {
  const bot = createBotPlayer(botDifficulty);

  // 生成機器人答案
  const botAnswer = await generateBotAnswer(
    "Sample Question",
    ["Option 1", "Option 2", "Option 3"],
    bot
  );

  // 判斷機器人是否正確（基於 confidence）
  const isBotCorrect = Math.random() * 100 < botAnswer.confidence;

  // 計算分數
  const playerFinalScore = isPlayerCorrect
    ? calculateBotScore(true, playerResponseTime)
    : 0;
  const botFinalScore = isBotCorrect
    ? calculateBotScore(true, botAnswer.responseTime)
    : 0;

  // 判斷勝負
  const playerWins = playerFinalScore > botFinalScore;

  if (playerWins) {
    bot.losses++;
  } else {
    bot.wins++;
  }

  const details = `
    玩家: ${isPlayerCorrect ? "✓ 正確" : "✗ 錯誤"} (${playerResponseTime}ms) = ${playerFinalScore} 分
    機器人 (${botDifficulty}): ${isBotCorrect ? "✓ 正確" : "✗ 錯誤"} (${botAnswer.responseTime}ms) = ${botFinalScore} 分
    結果: ${playerWins ? "玩家勝利！" : "機器人勝利！"}
  `;

  return {
    bot,
    botScore: botFinalScore,
    playerWins,
    details,
  };
}

/**
 * 獲取機器人統計
 */
export function getBotStats(bot: BotPlayer): {
  winRate: number;
  totalGames: number;
  difficulty: BotDifficulty;
} {
  const totalGames = bot.wins + bot.losses;
  const winRate = totalGames > 0 ? (bot.wins / totalGames) * 100 : 0;

  return {
    winRate: Math.round(winRate),
    totalGames,
    difficulty: bot.difficulty,
  };
}

/**
 * 難度排名
 */
export function getRankByDifficulty(difficulty: BotDifficulty): number {
  const ranks = {
    easy: 1,
    medium: 2,
    hard: 3,
    expert: 4,
  };
  return ranks[difficulty];
}
