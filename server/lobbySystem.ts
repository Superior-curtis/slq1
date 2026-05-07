/**
 * Lobby system for player management and matchmaking
 */

import { nanoid } from "nanoid";

export interface LobbyPlayer {
  id: number;
  name: string;
  socketId: string;
  status: "online" | "in_game" | "away";
  totalScore: number;
  gamesPlayed: number;
  joinedAt: number;
}

export interface LobbyStats {
  totalPlayers: number;
  onlinePlayers: number;
  inGamePlayers: number;
  awayPlayers: number;
  totalGamesPlayed: number;
}

const lobbyPlayers = new Map<number, LobbyPlayer>();

/**
 * Add player to lobby
 */
export function addPlayerToLobby(userId: number, name: string, socketId: string): LobbyPlayer {
  const player: LobbyPlayer = {
    id: userId,
    name,
    socketId,
    status: "online",
    totalScore: 0,
    gamesPlayed: 0,
    joinedAt: Date.now(),
  };

  lobbyPlayers.set(userId, player);
  return player;
}

/**
 * Remove player from lobby
 */
export function removePlayerFromLobby(userId: number): LobbyPlayer | null {
  const player = lobbyPlayers.get(userId);

  if (player) {
    lobbyPlayers.delete(userId);
  }

  return player || null;
}

/**
 * Update player status
 */
export function updatePlayerStatus(userId: number, status: "online" | "in_game" | "away"): LobbyPlayer | null {
  const player = lobbyPlayers.get(userId);

  if (player) {
    player.status = status;
  }

  return player || null;
}

/**
 * Get player from lobby
 */
export function getLobbyPlayer(userId: number): LobbyPlayer | null {
  return lobbyPlayers.get(userId) || null;
}

/**
 * Get all online players
 */
export function getOnlinePlayers(): LobbyPlayer[] {
  return Array.from(lobbyPlayers.values()).filter((p) => p.status === "online");
}

/**
 * Get all players in game
 */
export function getPlayersInGame(): LobbyPlayer[] {
  return Array.from(lobbyPlayers.values()).filter((p) => p.status === "in_game");
}

/**
 * Get all away players
 */
export function getAwayPlayers(): LobbyPlayer[] {
  return Array.from(lobbyPlayers.values()).filter((p) => p.status === "away");
}

/**
 * Get all lobby players
 */
export function getAllLobbyPlayers(): LobbyPlayer[] {
  return Array.from(lobbyPlayers.values());
}

/**
 * Get lobby statistics
 */
export function getLobbyStats(): LobbyStats {
  const allPlayers = Array.from(lobbyPlayers.values());
  const onlinePlayers = allPlayers.filter((p) => p.status === "online");
  const inGamePlayers = allPlayers.filter((p) => p.status === "in_game");
  const awayPlayers = allPlayers.filter((p) => p.status === "away");

  const totalGamesPlayed = allPlayers.reduce((sum, p) => sum + p.gamesPlayed, 0);

  return {
    totalPlayers: allPlayers.length,
    onlinePlayers: onlinePlayers.length,
    inGamePlayers: inGamePlayers.length,
    awayPlayers: awayPlayers.length,
    totalGamesPlayed,
  };
}

/**
 * Update player score and games
 */
export function updatePlayerStats(userId: number, scoreGain: number, won: boolean): LobbyPlayer | null {
  const player = lobbyPlayers.get(userId);

  if (player) {
    player.totalScore += scoreGain;
    player.gamesPlayed += 1;
  }

  return player || null;
}

/**
 * Get top players by score
 */
export function getTopPlayers(limit: number = 10): LobbyPlayer[] {
  return Array.from(lobbyPlayers.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
}

/**
 * Search players by name
 */
export function searchPlayers(query: string): LobbyPlayer[] {
  const lowerQuery = query.toLowerCase();

  return Array.from(lobbyPlayers.values()).filter((p) => p.name.toLowerCase().includes(lowerQuery));
}

/**
 * Clear all lobby players
 */
export function clearAllLobbyPlayers(): void {
  lobbyPlayers.clear();
}

/**
 * Get player by socket ID
 */
export function getPlayerBySocketId(socketId: string): LobbyPlayer | null {
  const players = Array.from(lobbyPlayers.values());
  for (const player of players) {
    if (player.socketId === socketId) {
      return player;
    }
  }

  return null;
}
