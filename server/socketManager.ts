import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";

/**
 * Socket.io 即時同步管理模組
 */

interface GameRoomState {
  roomId: string;
  players: Map<string, PlayerState>;
  currentQuestion: any;
  gameStarted: boolean;
  gameEnded: boolean;
  scores: Map<string, number>;
}

interface PlayerState {
  userId: string;
  username: string;
  socketId: string;
  score: number;
  answered: boolean;
  answer: string | null;
  responseTime: number;
}

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  roomId?: string;
}

interface VoiceSignal {
  from: string;
  to: string;
  signal: any;
}

const gameRooms = new Map<string, GameRoomState>();
const playerSockets = new Map<string, Socket>();
const lobbyChat: ChatMessage[] = [];
const maxLobbyChatMessages = 100;

/**
 * 初始化 Socket.io 伺服器
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.io] Player connected: ${socket.id}`);
    playerSockets.set(socket.id, socket);

    // 玩家加入遊戲房間
    socket.on("joinGameRoom", (data: { roomId: string; userId: string; username: string }) => {
      const { roomId, userId, username } = data;
      socket.join(roomId);

      // 初始化房間狀態
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          roomId,
          players: new Map(),
          currentQuestion: null,
          gameStarted: false,
          gameEnded: false,
          scores: new Map(),
        });
      }

      const room = gameRooms.get(roomId)!;
      room.players.set(userId, {
        userId,
        username,
        socketId: socket.id,
        score: 0,
        answered: false,
        answer: null,
        responseTime: 0,
      });

      // 廣播玩家加入事件
      io.to(roomId).emit("playerJoined", {
        userId,
        username,
        totalPlayers: room.players.size,
      });

      console.log(`[Socket.io] Player ${username} joined room ${roomId}`);
    });

    // 玩家離開遊戲房間
    socket.on("leaveGameRoom", (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      socket.leave(roomId);

      const room = gameRooms.get(roomId);
      if (room) {
        room.players.delete(userId);
        io.to(roomId).emit("playerLeft", {
          userId,
          totalPlayers: room.players.size,
        });

        // 如果房間沒有玩家，刪除房間
        if (room.players.size === 0) {
          gameRooms.delete(roomId);
        }
      }
    });

    // 遊戲開始
    socket.on("startGame", (data: { roomId: string }) => {
      const { roomId } = data;
      const room = gameRooms.get(roomId);
      if (room) {
        room.gameStarted = true;
        io.to(roomId).emit("gameStarted", {
          roomId,
          totalPlayers: room.players.size,
        });
      }
    });

    // 發送遊戲問題
    socket.on("sendQuestion", (data: { roomId: string; question: any }) => {
      const { roomId, question } = data;
      const room = gameRooms.get(roomId);
      if (room) {
        room.currentQuestion = question;
        // 重置玩家答題狀態
        room.players.forEach((player) => {
          player.answered = false;
          player.answer = null;
          player.responseTime = 0;
        });
        io.to(roomId).emit("newQuestion", question);
      }
    });

    // 玩家提交答案
    socket.on(
      "submitAnswer",
      (data: { roomId: string; userId: string; answer: string; responseTime: number }) => {
        const { roomId, userId, answer, responseTime } = data;
        const room = gameRooms.get(roomId);
        if (room) {
          const player = room.players.get(userId);
          if (player) {
            player.answered = true;
            player.answer = answer;
            player.responseTime = responseTime;

            // 廣播答題狀態
            io.to(roomId).emit("answerSubmitted", {
              userId,
              totalAnswered: Array.from(room.players.values()).filter((p) => p.answered).length,
              totalPlayers: room.players.size,
            });
          }
        }
      }
    );

    // 遊戲結束
    socket.on("endGame", (data: { roomId: string; results: any }) => {
      const { roomId, results } = data;
      const room = gameRooms.get(roomId);
      if (room) {
        room.gameEnded = true;
        io.to(roomId).emit("gameEnded", results);
      }
    });

    // 聊天消息
    socket.on("chatMessage", (data: { roomId?: string; userId: string; username: string; message: string }) => {
      const { roomId, userId, username, message } = data;
      const chatMsg: ChatMessage = {
        userId,
        username,
        message,
        timestamp: Date.now(),
        roomId,
      };

      if (roomId) {
        // 房間聊天
        io.to(roomId).emit("chatMessage", chatMsg);
      } else {
        // 大廳聊天
        lobbyChat.push(chatMsg);
        if (lobbyChat.length > maxLobbyChatMessages) {
          lobbyChat.shift();
        }
        io.emit("lobbyChatMessage", chatMsg);
      }
    });

    // 語音信令
    socket.on("voiceSignal", (data: VoiceSignal) => {
      const targetSocket = playerSockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit("voiceSignal", {
          from: data.from,
          signal: data.signal,
        });
      }
    });

    // 玩家斷開連接
    socket.on("disconnect", () => {
      console.log(`[Socket.io] Player disconnected: ${socket.id}`);
      playerSockets.delete(socket.id);

      // 清理房間
      gameRooms.forEach((room, roomId) => {
        const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
        if (player) {
          room.players.delete(player.userId);
          if (room.players.size === 0) {
            gameRooms.delete(roomId);
          }
        }
      });
    });
  });

  return io;
}

/**
 * 獲取房間狀態
 */
export function getRoomState(roomId: string): GameRoomState | undefined {
  return gameRooms.get(roomId);
}

/**
 * 獲取大廳聊天歷史
 */
export function getLobbyChatHistory(limit: number = 50): ChatMessage[] {
  return lobbyChat.slice(-limit);
}

/**
 * 清除房間
 */
export function clearRoom(roomId: string): void {
  gameRooms.delete(roomId);
}

/**
 * 獲取所有房間
 */
export function getAllRooms(): GameRoomState[] {
  return Array.from(gameRooms.values());
}
