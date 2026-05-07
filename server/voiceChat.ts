/**
 * Voice chat system using WebRTC
 * Manages peer connections and audio streams
 */

import { nanoid } from "nanoid";

export interface VoiceConnection {
  id: string;
  userId: number;
  roomId: string;
  peerId: string; // PeerJS peer ID
  isActive: boolean;
  connectedAt: number;
  disconnectedAt?: number;
}

export interface VoiceRoom {
  id: string;
  connections: VoiceConnection[];
  createdAt: number;
}

const voiceRooms = new Map<string, VoiceRoom>();
const userConnections = new Map<number, VoiceConnection>();

/**
 * Create a voice room
 */
export function createVoiceRoom(roomId: string): VoiceRoom {
  const voiceRoom: VoiceRoom = {
    id: roomId,
    connections: [],
    createdAt: Date.now(),
  };

  voiceRooms.set(roomId, voiceRoom);
  return voiceRoom;
}

/**
 * Add user to voice room
 */
export function addUserToVoiceRoom(userId: number, roomId: string, peerId: string): VoiceConnection {
  let room = voiceRooms.get(roomId);

  if (!room) {
    room = createVoiceRoom(roomId);
  }

  const connection: VoiceConnection = {
    id: nanoid(),
    userId,
    roomId,
    peerId,
    isActive: true,
    connectedAt: Date.now(),
  };

  room.connections.push(connection);
  userConnections.set(userId, connection);

  return connection;
}

/**
 * Remove user from voice room
 */
export function removeUserFromVoiceRoom(userId: number): VoiceConnection | null {
  const connection = userConnections.get(userId);

  if (!connection) {
    return null;
  }

  const room = voiceRooms.get(connection.roomId);

  if (room) {
    room.connections = room.connections.filter((c) => c.userId !== userId);

    // Delete room if empty
    if (room.connections.length === 0) {
      voiceRooms.delete(connection.roomId);
    }
  }

  connection.isActive = false;
  connection.disconnectedAt = Date.now();

  userConnections.delete(userId);

  return connection;
}

/**
 * Get voice room
 */
export function getVoiceRoom(roomId: string): VoiceRoom | null {
  return voiceRooms.get(roomId) || null;
}

/**
 * Get active connections in room
 */
export function getActiveConnections(roomId: string): VoiceConnection[] {
  const room = voiceRooms.get(roomId);

  if (!room) {
    return [];
  }

  return room.connections.filter((c) => c.isActive);
}

/**
 * Get user connection
 */
export function getUserConnection(userId: number): VoiceConnection | null {
  return userConnections.get(userId) || null;
}

/**
 * Get peer IDs for room (for signaling)
 */
export function getPeerIdsInRoom(roomId: string): string[] {
  const room = voiceRooms.get(roomId);

  if (!room) {
    return [];
  }

  return room.connections.filter((c) => c.isActive).map((c) => c.peerId);
}

/**
 * Check if user is in voice room
 */
export function isUserInVoiceRoom(userId: number, roomId: string): boolean {
  const connection = userConnections.get(userId);

  if (!connection) {
    return false;
  }

  return connection.roomId === roomId && connection.isActive;
}

/**
 * Get voice room statistics
 */
export function getVoiceRoomStats(roomId: string) {
  const room = voiceRooms.get(roomId);

  if (!room) {
    return null;
  }

  const activeConnections = room.connections.filter((c) => c.isActive);

  return {
    roomId,
    totalConnections: room.connections.length,
    activeConnections: activeConnections.length,
    createdAt: room.createdAt,
    uptime: Date.now() - room.createdAt,
  };
}

/**
 * Clear all voice rooms
 */
export function clearAllVoiceRooms(): void {
  voiceRooms.clear();
  userConnections.clear();
}
