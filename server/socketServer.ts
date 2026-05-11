import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import { nanoid } from "nanoid";

interface GameRoom {
  id: string;
  players: Map<string, { id: string; name: string; score: number }>;
  gameStarted: boolean;
  currentRound: number;
  timeLeft: number;
  chatMessages: Array<{ userId: string; userName: string; message: string; timestamp: number }>;
}

const gameRooms = new Map<string, GameRoom>();
const playerToRoom = new Map<string, string>();

export function initializeSocketServer(httpServer: Server) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] User connected: ${socket.id}`);
    
    // Ensure a room exists in-memory (created by API) so sockets can join it
    socket.on("ensureRoom", (data: { roomId: string }) => {
      const { roomId } = data || {} as any;
      if (!roomId) return;
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          id: roomId,
          players: new Map(),
          gameStarted: false,
          currentRound: 1,
          timeLeft: 30,
          chatMessages: [],
        });
        console.log(`[Socket.IO] ensureRoom created in-memory: ${roomId}`);
      }
    });

    // 加入遊戲房間
    socket.on("joinGameRoom", (data: { roomId: string; userName?: string; username?: string }, ack?: (res: any) => void) => {
      console.log(`[Socket.IO] joinGameRoom event from ${socket.id}:`, data);
      const { roomId } = data || {} as any;
      const userId = socket.id;
      const userName = (data && (data.userName || data.username)) || `Player_${userId.slice(0, 6)}`;

      // 創建或獲取房間
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          id: roomId,
          players: new Map(),
          gameStarted: false,
          currentRound: 1,
          timeLeft: 30,
          chatMessages: [],
        });
      }

      const room = gameRooms.get(roomId)!;
      room.players.set(userId, { id: userId, name: userName, score: 0 });
      playerToRoom.set(userId, roomId);

      // 加入 Socket.IO 房間
      socket.join(roomId);

      // 通知其他玩家
      io.to(roomId).emit("playerJoined", { id: userId, name: userName });

      // 發送當前房間狀態
      socket.emit("gameStateUpdate", {
        roomId,
        players: Array.from(room.players.values()),
        gameStarted: room.gameStarted,
        currentRound: room.currentRound,
        timeLeft: room.timeLeft,
      });

      console.log(`[Socket.IO] User ${userId} joined room ${roomId}`);
      try {
        if (typeof ack === "function") ack({ ok: true, roomId });
      } catch (e) {
        // noop
      }
    });

    // 發送聊天消息
    socket.on("chatMessage", (data: { roomId?: string; userId?: string; username?: string; message: string }, ack?: (res: any) => void) => {
      console.log(`[Socket.IO] chatMessage event from ${socket.id}:`, data);
      const roomId = (data && data.roomId) || playerToRoom.get(socket.id);
      if (!roomId) {
        if (typeof ack === "function") ack({ ok: false, error: "no_room" });
        return;
      }

      const room = gameRooms.get(roomId);
      if (!room) {
        if (typeof ack === "function") ack({ ok: false, error: "room_not_found" });
        return;
      }

      const player = room.players.get(socket.id);
      const userName = (data && data.username) || player?.name || `Player_${socket.id.slice(0, 6)}`;

      const chatMessage = {
        userId: (data && data.userId) || socket.id,
        userName,
        message: data.message,
        timestamp: Date.now(),
      };

      room.chatMessages.push(chatMessage);

      // 保持最後 100 條消息
      if (room.chatMessages.length > 100) {
        room.chatMessages = room.chatMessages.slice(-100);
      }

      // 廣播到房間內所有玩家
      io.to(roomId).emit("chatMessage", chatMessage);

      console.log(`[Socket.IO] Message in ${roomId}: ${userName}: ${data.message}`);
      if (typeof ack === "function") ack({ ok: true });
    });

    // 提交答案
    socket.on("submitAnswer", (data: { answer: string; responseTime: number }) => {
      const roomId = playerToRoom.get(socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player) return;

      // 廣播答案提交事件
      io.to(roomId).emit("answerSubmitted", {
        playerId: socket.id,
        playerName: player.name,
        answer: data.answer,
        responseTime: data.responseTime,
      });

      console.log(`[Socket.IO] Answer submitted in ${roomId}: ${player.name} - ${data.answer}`);
    });

    // 開始遊戲
    socket.on("startGame", (data: { roomId?: string } = {}) => {
      const roomId = data.roomId || playerToRoom.get(socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      room.gameStarted = true;
      room.currentRound = 1;
      room.timeLeft = 30;

      io.to(roomId).emit("gameStart", {
        roomId,
        currentRound: room.currentRound,
        timeLeft: room.timeLeft,
      });

      console.log(`[Socket.IO] Game started in ${roomId}`);

      // 啟動計時器
      const timer = setInterval(() => {
        room.timeLeft--;

        if (room.timeLeft <= 0) {
          clearInterval(timer);
          io.to(roomId).emit("roundEnd", { round: room.currentRound });
        } else {
          io.to(roomId).emit("timerUpdate", { timeLeft: room.timeLeft });
        }
      }, 1000);
    });

    // 下一輪
    socket.on("nextRound", () => {
      const roomId = playerToRoom.get(socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      room.currentRound++;
      room.timeLeft = 30;

      io.to(roomId).emit("roundStart", {
        round: room.currentRound,
        timeLeft: room.timeLeft,
      });

      console.log(`[Socket.IO] Round ${room.currentRound} started in ${roomId}`);
    });

    // 斷開連接
    socket.on("disconnect", () => {
      const roomId = playerToRoom.get(socket.id);

      if (roomId) {
        const room = gameRooms.get(roomId);
        if (room) {
          room.players.delete(socket.id);

          // 如果房間空了，刪除房間
          if (room.players.size === 0) {
            gameRooms.delete(roomId);
          } else {
            // 通知其他玩家
            io.to(roomId).emit("playerLeft", socket.id);
          }
        }
      }

      playerToRoom.delete(socket.id);
      console.log(`[Socket.IO] User disconnected: ${socket.id}`);
    });

    // 錯誤處理
    socket.on("error", (error) => {
      console.error(`[Socket.IO] Error for ${socket.id}:`, error);
    });
  });

  return io;
}

export function getGameRoom(roomId: string): GameRoom | undefined {
  return gameRooms.get(roomId);
}

export function getAllGameRooms(): GameRoom[] {
  return Array.from(gameRooms.values());
}
