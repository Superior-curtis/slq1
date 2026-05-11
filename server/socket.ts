import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { getGameRoomById, updateGameRoom } from "./db";
import { 
  finishGame, 
  updatePlayerScore,
  addPlayerToRoom
} from "./gameLogic";
import { advanceGameRound, shouldGameEnd, startGameWithContent } from "./matchmaking";
import { nanoid } from "nanoid";

interface GameSocket extends Socket {
  userId?: number;
  roomId?: string;
}

/**
 * Initialize Socket.io server
 */
export function initializeSocketIO(server: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? process.env.VITE_FRONTEND_URL 
        : "http://localhost:5173",
      credentials: true,
    },
  });

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    const roomId = socket.handshake.auth.roomId;

    if (!userId || !roomId) {
      return next(new Error("Missing userId or roomId"));
    }

    (socket as GameSocket).userId = userId;
    (socket as GameSocket).roomId = roomId;
    next();
  });

  // Connection handler
  io.on("connection", (socket: GameSocket) => {
    const userId = socket.userId!;
    const roomId = socket.roomId!;

    console.log(`[Socket] Player ${userId} connected to room ${roomId}`);

    // Join room
    socket.join(roomId);

    // Notify room that player joined
    io.to(roomId).emit("playerJoined", {
      userId,
      timestamp: Date.now(),
    });

    // Handle game start
    socket.on("gameStart", async () => {
      try {
        const result = await startGameWithContent(roomId);
        if (result.success) {
          const room = await getGameRoomById(roomId);
          io.to(roomId).emit("gameStarted", {
            currentRound: room?.currentRound,
            totalRounds: room?.totalRounds,
            content: {
              url: room?.currentContent?.url,
              type: room?.gameMode,
            },
          });
        } else {
          socket.emit("error", { message: result.reason || "Failed to start game" });
        }
      } catch (error) {
        console.error("[Socket] Failed to start game:", error);
        socket.emit("error", { message: "Failed to start game" });
      }
    });

    // Handle answer submission
    socket.on("submitAnswer", async (data: { answer: string; responseTimeMs: number }) => {
      try {
        const room = await getGameRoomById(roomId);
        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        // Update player score (handled by tRPC in production)
        const score = Math.max(100, 1000 - Math.floor(data.responseTimeMs / 10));
        await updatePlayerScore(roomId, userId, score);

        // Broadcast score update to room
        io.to(roomId).emit("scoreUpdated", {
          userId,
          score,
          responseTime: data.responseTimeMs,
        });

        // Check if all players have answered
        const playerIds = room.playerIds as number[];
        const playerScores = room.playerScores as Record<number, number>;

        // Simulate checking if round should advance
        // In production, implement proper round state tracking
        setTimeout(async () => {
          try {
            const shouldEnd = await shouldGameEnd(roomId);
            if (shouldEnd) {
              // Finish game
              await finishGame(roomId);
              io.to(roomId).emit("gameFinished", {
                results: playerIds.map(id => ({
                  userId: id,
                  score: playerScores[id] || 0,
                })),
              });
            } else {
              // Advance to next round
              const success = await advanceGameRound(roomId);
              if (success) {
                const updatedRoom = await getGameRoomById(roomId);
                io.to(roomId).emit("nextRound", {
                  round: updatedRoom?.currentRound,
                  content: {
                    url: updatedRoom?.currentContent?.url,
                    type: updatedRoom?.gameMode,
                  },
                });
              }
            }
          } catch (err) {
            console.error("[Socket] Error advancing round:", err);
          }
        }, 2000); // 2 second delay before advancing
      } catch (error) {
        console.error("[Socket] Failed to submit answer:", error);
        socket.emit("error", { message: "Failed to submit answer" });
      }
    });

    // Handle player disconnection
    socket.on("disconnect", () => {
      console.log(`[Socket] Player ${userId} disconnected from room ${roomId}`);
      io.to(roomId).emit("playerLeft", {
        userId,
        timestamp: Date.now(),
      });
    });

    // Handle errors
    socket.on("error", (error: any) => {
      console.error(`[Socket] Error from player ${userId}:`, error);
    });
  });

  return io;
}

/**
 * Emit notification to specific user
 */
export function notifyUser(io: SocketIOServer, userId: number, notification: any): void {
  // In production, you would track user socket IDs and emit to them
  // For now, we emit to a user-specific room
  io.to(`user:${userId}`).emit("notification", notification);
}

/**
 * Broadcast game state update to room
 */
export function broadcastGameState(io: SocketIOServer, roomId: string, state: any): void {
  io.to(roomId).emit("gameStateUpdate", state);
}
