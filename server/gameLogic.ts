import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { 
  createGameRoom, 
  updateGameRoom, 
  createGameHistory,
  updateLeaderboard,
  getUserById,
  createNotification,
  getDb
} from "./db";
import { eq } from "drizzle-orm";
import type { GameRoom } from "../drizzle/schema";

/**
 * Generate a unique room code for duel mode
 */
export function generateRoomCode(): string {
  return nanoid(8).toUpperCase();
}

/**
 * Calculate score based on response time and correctness
 * Faster responses get higher scores (max 1000 points per question)
 */
export function calculateScore(responseTimeMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;

  // Base score: 1000 points
  // Deduct 1 point per 100ms (max deduction 500 points)
  const timeDeduction = Math.min(500, Math.floor(responseTimeMs / 100));
  return Math.max(100, 1000 - timeDeduction);
}

/**
 * Use LLM to validate player answer against correct answers
 * Allows for typos, alternate names, and similar variations
 */
export async function validateAnswerWithLLM(
  playerAnswer: string,
  correctAnswers: string[]
): Promise<boolean> {
  if (!playerAnswer.trim()) return false;

  const prompt = `You are a game answer validator. A player answered: "${playerAnswer}"

The correct answers are: ${correctAnswers.join(", ")}

Determine if the player's answer is correct. Consider:
- Typos and spelling variations
- Alternate names or stage names
- Partial matches (e.g., first name only when full name is correct)
- Case insensitivity

Respond with ONLY "true" or "false".`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a strict but fair game answer validator. Respond with only 'true' or 'false'."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    const contentStr = typeof content === 'string' ? content : '';
    return contentStr.toLowerCase().includes("true");
  } catch (error) {
    console.error("[LLM] Answer validation failed:", error);
    // Fallback to exact match if LLM fails
    return correctAnswers.some(answer => 
      answer.toLowerCase().includes(playerAnswer.toLowerCase()) ||
      playerAnswer.toLowerCase().includes(answer.toLowerCase())
    );
  }
}

/**
 * Create a new game room
 */
export async function createNewGameRoom(
  creatorId: number,
  gameMode: 'picture' | 'video',
  roomType: 'random' | 'duel' = 'random',
  maxPlayers: number = 2
): Promise<GameRoom | null> {
  const roomId = nanoid();
  const roomCode = generateRoomCode(); // Always generate unique code

  const room = {
    id: roomId,
    roomCode,
    roomType,
    gameMode,
    creatorId,
    playerIds: [creatorId],
    maxPlayers,
    status: 'waiting' as const,
    currentRound: 0,
    totalRounds: 5,
    playerScores: { [creatorId]: 0 }
  };

  try {
    await createGameRoom(room);
    return room as GameRoom;
  } catch (error) {
    console.error("[GameLogic] Failed to create game room:", error);
    return null;
  }
}

/**
 * Add player to game room
 */
export async function addPlayerToRoom(roomId: string, playerId: number): Promise<boolean> {
  try {
    const { getGameRoomById } = await import("./db");
    const room = await getGameRoomById(roomId);
    if (!room) return false;

    const playerIds = room.playerIds as number[];
    if (playerIds.includes(playerId)) return false;
    if (playerIds.length >= room.maxPlayers) return false;

    const updatedPlayerIds = [...playerIds, playerId];
    const updatedScores = { ...room.playerScores, [playerId]: 0 };

    await updateGameRoom(roomId, {
      playerIds: updatedPlayerIds as any,
      playerScores: updatedScores as any
    });

    return true;
  } catch (error) {
    console.error("[GameLogic] Failed to add player to room:", error);
    return false;
  }
}

/**
 * Start a game (transition from waiting to active)
 */
export async function startGame(roomId: string): Promise<boolean> {
  try {
    await updateGameRoom(roomId, {
      status: 'active' as const,
      currentRound: 1
    });
    return true;
  } catch (error) {
    console.error("[GameLogic] Failed to start game:", error);
    return false;
  }
}

/**
 * Update player score in a room
 */
export async function updatePlayerScore(
  roomId: string,
  playerId: number,
  scoreToAdd: number
): Promise<boolean> {
  try {
    const { getGameRoomById } = await import("./db");
    const room = await getGameRoomById(roomId);
    if (!room) return false;

    const playerScores = { ...room.playerScores } as Record<number, number>;
    playerScores[playerId] = (playerScores[playerId] || 0) + scoreToAdd;

    await updateGameRoom(roomId, {
      playerScores: playerScores as any
    });

    return true;
  } catch (error) {
    console.error("[GameLogic] Failed to update player score:", error);
    return false;
  }
}

/**
 * Finish a game and record history
 */
export async function finishGame(roomId: string): Promise<boolean> {
  try {
    const { getGameRoomById } = await import("./db");
    const room = await getGameRoomById(roomId);
    if (!room) return false;

    const playerScores = room.playerScores as Record<number, number>;
    const playerIds = room.playerIds as number[];

    // Sort players by score
    const rankedPlayers = playerIds
      .map(id => ({ playerId: id, score: playerScores[id] || 0 }))
      .sort((a, b) => b.score - a.score);

    // Record game history for each player
    for (let rank = 0; rank < rankedPlayers.length; rank++) {
      const { playerId, score } = rankedPlayers[rank];
      const opponentIds = playerIds.filter(id => id !== playerId);

      try {
        // Calculate average response time (placeholder - should be tracked during game)
        const avgResponseTime = Math.random() * 5; // Placeholder
        
        await createGameHistory({
          id: nanoid(),
          roomId,
          playerId,
          opponentIds,
          gameMode: room.gameMode,
          roomType: room.roomType,
          score,
          rank: rank + 1,
          correctAnswers: Math.floor(Math.random() * room.totalRounds), // Placeholder
          totalAnswers: room.totalRounds,
          averageResponseTime: avgResponseTime.toString()
        });

        // Update user stats
        const user = await getUserById(playerId);
        if (user) {
          const isWinner = rank === 0;
          const newTotalScore = user.totalScore + score;
          const newGamesPlayed = user.gamesPlayed + 1;
          const newGamesWon = user.gamesWon + (isWinner ? 1 : 0);
          const newWinRate = (newGamesWon / newGamesPlayed) * 100;

          // Update user stats in database
          const db = await getDb();
          if (db) {
            const { users: usersTable } = await import("../drizzle/schema");
            await db
              .update(usersTable)
              .set({
                totalScore: newTotalScore,
                gamesPlayed: newGamesPlayed,
                gamesWon: newGamesWon,
              })
              .where(eq(usersTable.id, playerId));
          }

          // Update leaderboard
          await updateLeaderboard(playerId, {
            totalScore: newTotalScore,
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            winRate: newWinRate,
          });

          // Notify winner about rank change
          if (rank === 0) {
            await createNotification({
              id: nanoid(),
              userId: playerId,
              type: 'rank_change',
              title: '🎉 恭喜！您贏得了這場遊戲',
              content: `您的排名已更新，目前積分：${newTotalScore}`,
              relatedRoomId: roomId
            });
          }
        }
      } catch (error) {
        console.error(`[GameLogic] Failed to record history for player ${playerId}:`, error);
      }
    }

    // Mark room as finished
    await updateGameRoom(roomId, {
      status: 'finished' as const,
      finishedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error("[GameLogic] Failed to finish game:", error);
    return false;
  }
}

/**
 * Get game statistics for a player
 */
export async function getPlayerGameStats(playerId: number) {
  try {
    const user = await getUserById(playerId);
    if (!user) return null;

    const winRate = user.gamesPlayed > 0 
      ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(2)
      : "0.00";

    return {
      totalScore: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      winRate: parseFloat(winRate),
      correctAnswers: user.correctAnswers,
      totalAnswers: user.totalAnswers,
      accuracy: user.totalAnswers > 0 
        ? ((user.correctAnswers / user.totalAnswers) * 100).toFixed(2)
        : "0.00"
    };
  } catch (error) {
    console.error("[GameLogic] Failed to get player stats:", error);
    return null;
  }
}
