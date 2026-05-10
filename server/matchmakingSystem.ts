/**
 * 遊戲配對系統
 * 實現 Random Match 玩家隊列和配對邏輯
 */

import { nanoid } from "nanoid";

export interface Player {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: number;
  rating: number;
  gameMode: "picture" | "video";
}

export interface MatchmakingQueue {
  players: Player[];
  createdAt: number;
}

export interface GameMatch {
  matchId: string;
  player1: Player;
  player2: Player;
  createdAt: number;
  status: "waiting" | "playing" | "finished";
  roomId?: string;
  roomCode?: string;
}

// 全局隊列
const matchmakingQueue: MatchmakingQueue = {
  players: [],
  createdAt: Date.now(),
};

// 活躍的遊戲匹配
const activeMatches = new Map<string, GameMatch>();
const playerToMatchId = new Map<string, string>();

/**
 * 玩家加入隊列
 */
export function addPlayerToQueue(player: Player): void {
  // 檢查玩家是否已在隊列中
  const existingIndex = matchmakingQueue.players.findIndex((p) => p.userId === player.userId);
  if (existingIndex !== -1) {
    console.log(`[Matchmaking] Player ${player.username} already in queue`);
    return;
  }

  matchmakingQueue.players.push({
    ...player,
    joinedAt: Date.now(),
  });

  console.log(`[Matchmaking] Player ${player.username} joined queue. Queue size: ${matchmakingQueue.players.length}`);

  // 嘗試配對
  tryMatchPlayers();
}

/**
 * 玩家離開隊列
 */
export function removePlayerFromQueue(userId: string): void {
  const index = matchmakingQueue.players.findIndex((p) => p.userId === userId);
  if (index !== -1) {
    const player = matchmakingQueue.players[index];
    matchmakingQueue.players.splice(index, 1);
    playerToMatchId.delete(userId);
    console.log(`[Matchmaking] Player ${player.username} left queue. Queue size: ${matchmakingQueue.players.length}`);
  }
}

/**
 * 嘗試配對玩家
 */
export function tryMatchPlayers(): GameMatch | null {
  if (matchmakingQueue.players.length < 2) {
    console.log(`[Matchmaking] Not enough players in queue (${matchmakingQueue.players.length})`);
    return null;
  }

  const targetGameMode = ["picture", "video" as const].find((mode) =>
    matchmakingQueue.players.filter((player) => player.gameMode === mode).length >= 2
  );

  if (!targetGameMode) {
    console.log(`[Matchmaking] No mode with enough players to match (${matchmakingQueue.players.length})`);
    return null;
  }

  // 只配對相同遊戲模式的玩家，再依等級匹配
  const sortedPlayers = [...matchmakingQueue.players]
    .filter((player) => player.gameMode === targetGameMode)
    .sort((a, b) => a.rating - b.rating);

  if (sortedPlayers.length < 2) {
    return null;
  }

  // 找到最接近的兩個玩家
  let bestMatch: [Player, Player] | null = null;
  let bestDifference = Infinity;

  for (let i = 0; i < sortedPlayers.length - 1; i++) {
    const difference = Math.abs(sortedPlayers[i].rating - sortedPlayers[i + 1].rating);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestMatch = [sortedPlayers[i], sortedPlayers[i + 1]];
    }
  }

  if (!bestMatch) {
    return null;
  }

  const [player1, player2] = bestMatch;

  // 從隊列中移除這兩個玩家
  matchmakingQueue.players = matchmakingQueue.players.filter(
    (p) => p.userId !== player1.userId && p.userId !== player2.userId
  );

  // 創建遊戲匹配
  const match: GameMatch = {
    matchId: nanoid(12),
    player1,
    player2,
    createdAt: Date.now(),
    status: "waiting",
  };

  activeMatches.set(match.matchId, match);
  playerToMatchId.set(player1.userId, match.matchId);
  playerToMatchId.set(player2.userId, match.matchId);

  console.log(`[Matchmaking] Matched ${player1.username} vs ${player2.username}. Match ID: ${match.matchId}`);

  return match;
}

/**
 * 獲取隊列中的玩家數量
 */
export function getQueueSize(): number {
  return matchmakingQueue.players.length;
}

/**
 * 獲取玩家的隊列位置
 */
export function getPlayerQueuePosition(userId: string): number {
  return matchmakingQueue.players.findIndex((p) => p.userId === userId) + 1;
}

/**
 * 獲取活躍的遊戲匹配
 */
export function getActiveMatch(matchId: string): GameMatch | undefined {
  return activeMatches.get(matchId);
}

export function getMatchedRoomIdForPlayer(userId: string): string | undefined {
  const matchId = playerToMatchId.get(userId);
  if (!matchId) return undefined;
  return activeMatches.get(matchId)?.roomId;
}

export function assignRoomToMatch(matchId: string, roomId: string, roomCode?: string): void {
  const match = activeMatches.get(matchId);
  if (!match) return;

  match.roomId = roomId;
  match.roomCode = roomCode;
  activeMatches.set(matchId, match);
}

/**
 * 更新遊戲匹配狀態
 */
export function updateMatchStatus(matchId: string, status: "waiting" | "playing" | "finished"): void {
  const match = activeMatches.get(matchId);
  if (match) {
    match.status = status;
    console.log(`[Matchmaking] Match ${matchId} status updated to ${status}`);
  }
}

/**
 * 完成遊戲匹配
 */
export function completeMatch(matchId: string): void {
  const match = activeMatches.get(matchId);
  if (match) {
    match.status = "finished";
    // 保留 5 分鐘後刪除
    setTimeout(() => {
      activeMatches.delete(matchId);
      console.log(`[Matchmaking] Match ${matchId} deleted`);
    }, 300000);
  }
}

/**
 * 獲取所有活躍的匹配
 */
export function getAllActiveMatches(): GameMatch[] {
  return Array.from(activeMatches.values());
}

/**
 * 清空隊列（用於測試）
 */
export function clearQueue(): void {
  matchmakingQueue.players = [];
  playerToMatchId.clear();
  console.log("[Matchmaking] Queue cleared");
}

/**
 * 清空所有匹配（用於測試）
 */
export function clearAllMatches(): void {
  activeMatches.clear();
  playerToMatchId.clear();
  console.log("[Matchmaking] All matches cleared");
}
