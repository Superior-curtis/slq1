/**
 * Chat system for lobby and game rooms
 * Manages messages and real-time communication
 */

import { nanoid } from "nanoid";

interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  message: string;
  timestamp: number;
}

interface ChatRoom {
  messages: ChatMessage[];
  maxMessages: number;
}

const lobbyChatRoom: ChatRoom = {
  messages: [],
  maxMessages: 100,
};

const roomChats = new Map<string, ChatRoom>();

export function addLobbyMessage(userId: number, userName: string, message: string): ChatMessage {
  const chatMessage: ChatMessage = {
    id: nanoid(),
    userId,
    userName,
    message,
    timestamp: Date.now(),
  };

  lobbyChatRoom.messages.push(chatMessage);

  // Keep only last N messages
  if (lobbyChatRoom.messages.length > lobbyChatRoom.maxMessages) {
    lobbyChatRoom.messages = lobbyChatRoom.messages.slice(-lobbyChatRoom.maxMessages);
  }

  return chatMessage;
}

export function addRoomMessage(roomId: string, userId: number, userName: string, message: string): ChatMessage {
  if (!roomChats.has(roomId)) {
    roomChats.set(roomId, { messages: [], maxMessages: 50 });
  }

  const room = roomChats.get(roomId)!;
  const chatMessage: ChatMessage = {
    id: nanoid(),
    userId,
    userName,
    message,
    timestamp: Date.now(),
  };

  room.messages.push(chatMessage);

  // Keep only last N messages
  if (room.messages.length > room.maxMessages) {
    room.messages = room.messages.slice(-room.maxMessages);
  }

  return chatMessage;
}

export function getLobbyMessages(limit: number = 50): ChatMessage[] {
  return lobbyChatRoom.messages.slice(-limit);
}

export function getRoomMessages(roomId: string, limit: number = 50): ChatMessage[] {
  const room = roomChats.get(roomId);
  if (!room) return [];
  return room.messages.slice(-limit);
}

export function clearRoomChat(roomId: string): void {
  roomChats.delete(roomId);
}
