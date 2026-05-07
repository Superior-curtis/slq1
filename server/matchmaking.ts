import { nanoid } from "nanoid";
import { 
  getWaitingGameRooms, 
  getGameRoomById,
  getRandomContent,
  updateGameRoom
} from "./db";
import { 
  createNewGameRoom,
  addPlayerToRoom
} from "./gameLogic";
import type { GameRoom } from "../drizzle/schema";

/**
 * Find or create a game room for random matchmaking
 */
export async function findOrCreateRandomRoom(
  playerId: number,
  gameMode: 'picture' | 'video'
): Promise<{ roomId: string; isNew: boolean } | null> {
  try {
    // Try to find an existing waiting room
    const waitingRooms = await getWaitingGameRooms(gameMode, 5);
    
    for (const room of waitingRooms) {
      const playerIds = room.playerIds as number[];
      
      // Skip if player is already in this room
      if (playerIds.includes(playerId)) continue;
      
      // Skip if room is full
      if (playerIds.length >= room.maxPlayers) continue;
      
      // Try to add player to this room
      const success = await addPlayerToRoom(room.id, playerId);
      if (success) {
        return { roomId: room.id, isNew: false };
      }
    }
    
    // No available room found, create a new one
    const newRoom = await createNewGameRoom(playerId, gameMode, 'random', 2);
    if (!newRoom) {
      return null;
    }
    
    return { roomId: newRoom.id, isNew: true };
  } catch (error) {
    console.error("[Matchmaking] Failed to find or create room:", error);
    return null;
  }
}

/**
 * Start a game and set initial content
 */
export async function startGameWithContent(roomId: string): Promise<boolean> {
  try {
    const room = await getGameRoomById(roomId);
    if (!room) return false;
    
    // Get random content for the game
    const content = await getRandomContent(room.gameMode);
    if (!content) return false;
    
    // Update room with content and start status
    await updateGameRoom(roomId, {
      status: 'active' as const,
      currentRound: 1,
      currentContent: {
        type: room.gameMode,
        url: content.sourceUrl,
        contentId: content.id,
        correctAnswers: content.correctAnswers as string[]
      } as any
    });
    
    return true;
  } catch (error) {
    console.error("[Matchmaking] Failed to start game with content:", error);
    return false;
  }
}

/**
 * Advance to next round in a game
 */
export async function advanceGameRound(roomId: string): Promise<boolean> {
  try {
    const room = await getGameRoomById(roomId);
    if (!room) return false;
    
    const nextRound = room.currentRound + 1;
    
    // Check if game is over
    if (nextRound > room.totalRounds) {
      return false; // Game should be finished, not advanced
    }
    
    // Get new content for next round
    const content = await getRandomContent(room.gameMode);
    if (!content) return false;
    
    // Update room with new content and round
    await updateGameRoom(roomId, {
      currentRound: nextRound,
      currentContent: {
        type: room.gameMode,
        url: content.sourceUrl,
        contentId: content.id,
        correctAnswers: content.correctAnswers as string[]
      } as any
    });
    
    return true;
  } catch (error) {
    console.error("[Matchmaking] Failed to advance game round:", error);
    return false;
  }
}

/**
 * Check if game should end
 */
export async function shouldGameEnd(roomId: string): Promise<boolean> {
  try {
    const room = await getGameRoomById(roomId);
    if (!room) return false;
    
    return room.currentRound >= room.totalRounds;
  } catch (error) {
    console.error("[Matchmaking] Failed to check if game should end:", error);
    return false;
  }
}

/**
 * Get game results
 */
export async function getGameResults(roomId: string): Promise<{
  winners: Array<{ playerId: number; score: number }>;
  results: Array<{ playerId: number; score: number; rank: number }>;
} | null> {
  try {
    const room = await getGameRoomById(roomId);
    if (!room) return null;
    
    const playerScores = room.playerScores as Record<number, number>;
    const playerIds = room.playerIds as number[];
    
    // Sort players by score
    const results = playerIds
      .map(id => ({ playerId: id, score: playerScores[id] || 0 }))
      .sort((a, b) => b.score - a.score)
      .map((result, idx) => ({ ...result, rank: idx + 1 }));
    
    // Get winners (top score)
    const maxScore = Math.max(...results.map(r => r.score));
    const winners = results.filter(r => r.score === maxScore);
    
    return { winners, results };
  } catch (error) {
    console.error("[Matchmaking] Failed to get game results:", error);
    return null;
  }
}
