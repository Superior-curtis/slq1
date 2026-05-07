import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  createNewGameRoom,
  addPlayerToRoom,
  startGame,
  updatePlayerScore,
  finishGame,
  calculateScore,
  validateAnswerWithLLM,
  getPlayerGameStats,
} from "./gameLogic";
import {
  getGameRoomById,
  getGameRoomByCode,
  getWaitingGameRooms,
  getTopLeaderboard,
  getUserLeaderboardRank,
  getUserGameHistory,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  getRandomContent,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Game routes
  game: router({
    // Create a new game room
    createRoom: protectedProcedure
      .input(
        z.object({
          gameMode: z.enum(["picture", "video"]),
          roomType: z.enum(["random", "duel"]).default("random"),
          maxPlayers: z.number().min(2).max(4).default(2),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const room = await createNewGameRoom(
          ctx.user.id,
          input.gameMode,
          input.roomType,
          input.maxPlayers
        );

        if (!room) {
          throw new Error("Failed to create game room");
        }

        return {
          roomId: room.id,
          roomCode: room.roomCode,
          roomType: room.roomType,
          gameMode: room.gameMode,
        };
      }),

    // Join an existing room by code
    joinRoom: protectedProcedure
      .input(z.object({ roomCode: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const room = await getGameRoomByCode(input.roomCode);

        if (!room) {
          throw new Error("Room not found");
        }

        const success = await addPlayerToRoom(room.id, ctx.user.id);

        if (!success) {
          throw new Error("Failed to join room");
        }

        return {
          roomId: room.id,
          roomCode: room.roomCode,
        };
      }),

    // Get room details
    getRoom: publicProcedure
      .input(z.object({ roomId: z.string() }))
      .query(async ({ input }) => {
        const room = await getGameRoomById(input.roomId);

        if (!room) {
          return null;
        }

        return {
          id: room.id,
          roomCode: room.roomCode,
          roomType: room.roomType,
          gameMode: room.gameMode,
          status: room.status,
          playerIds: room.playerIds,
          playerScores: room.playerScores,
          currentRound: room.currentRound,
          totalRounds: room.totalRounds,
        };
      }),

    // Start a game
    startGame: protectedProcedure
      .input(z.object({ roomId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const room = await getGameRoomById(input.roomId);

        if (!room) {
          throw new Error("Room not found");
        }

        if (room.creatorId !== ctx.user.id) {
          throw new Error("Only room creator can start the game");
        }

        const success = await startGame(input.roomId);

        if (!success) {
          throw new Error("Failed to start game");
        }

        return { success: true };
      }),

    // Submit answer and get score
    submitAnswer: protectedProcedure
      .input(
        z.object({
          roomId: z.string(),
          answer: z.string(),
          responseTimeMs: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const room = await getGameRoomById(input.roomId);

        if (!room || !room.currentContent) {
          throw new Error("Room or content not found");
        }

        const correctAnswers = room.currentContent.correctAnswers || [];
        const isCorrect = await validateAnswerWithLLM(input.answer, correctAnswers);

        const score = calculateScore(input.responseTimeMs, isCorrect);

        await updatePlayerScore(input.roomId, ctx.user.id, score);

        return {
          isCorrect,
          score,
          correctAnswers,
        };
      }),

    // Get random content for game
    getRandomContent: publicProcedure
      .input(z.object({ contentType: z.enum(["picture", "video"]) }))
      .query(async ({ input }) => {
        const content = await getRandomContent(input.contentType);

        if (!content) {
          return null;
        }

        return {
          id: content.id,
          url: content.sourceUrl,
          title: content.title,
          type: content.contentType,
          // Don't expose correct answers to client
        };
      }),

    // Finish game and get results
    finishGame: protectedProcedure
      .input(z.object({ roomId: z.string() }))
      .mutation(async ({ input }) => {
        const success = await finishGame(input.roomId);

        if (!success) {
          throw new Error("Failed to finish game");
        }

        return { success: true };
      }),
  }),

  // Leaderboard routes
  leaderboard: router({
    // Get top 100 players
    getTop: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(100) }))
      .query(async ({ input }) => {
        const leaderboard = await getTopLeaderboard(input.limit);

        return leaderboard.map((entry, idx) => ({
          rank: idx + 1,
          userId: entry.userId,
          totalScore: entry.totalScore,
          gamesPlayed: entry.gamesPlayed,
          gamesWon: entry.gamesWon,
          winRate: parseFloat(entry.winRate.toString()),
        }));
      }),

    // Get player's rank
    getPlayerRank: protectedProcedure.query(async ({ ctx }) => {
      const rank = await getUserLeaderboardRank(ctx.user.id);

      if (!rank) {
        return null;
      }

      return {
        rank: rank.rank,
        totalScore: rank.totalScore,
        gamesPlayed: rank.gamesPlayed,
        gamesWon: rank.gamesWon,
        winRate: parseFloat(rank.winRate.toString()),
      };
    }),
  }),

  // Player profile routes
  profile: router({
    // Get player stats
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await getPlayerGameStats(ctx.user.id);

      if (!stats) {
        return null;
      }

      return stats;
    }),

    // Get game history
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input, ctx }) => {
        const history = await getUserGameHistory(ctx.user.id, input.limit);

        return history.map((game) => ({
          id: game.id,
          roomId: game.roomId,
          gameMode: game.gameMode,
          roomType: game.roomType,
          score: game.score,
          rank: game.rank,
          correctAnswers: game.correctAnswers,
          totalAnswers: game.totalAnswers,
          createdAt: game.createdAt,
        }));
      }),
  }),

  // Notification routes
  notifications: router({
    // Get user notifications
    getNotifications: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(50) }))
      .query(async ({ input, ctx }) => {
        const notifications = await getUserNotifications(ctx.user.id, input.limit);

        return notifications.map((notif) => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          content: notif.content,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
          relatedRoomId: notif.relatedRoomId,
        }));
      }),

    // Mark notification as read
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.string() }))
      .mutation(async ({ input }) => {
        await markNotificationAsRead(input.notificationId);
        return { success: true };
      }),

    // Mark all notifications as read
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),

    // Send notification (admin only)
    send: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          type: z.enum([
            "game_invite",
            "game_started",
            "game_finished",
            "rank_change",
            "new_challenge",
            "opponent_joined",
          ]),
          title: z.string(),
          content: z.string().optional(),
          relatedRoomId: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Only allow sending to self or if admin
        if (input.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        await createNotification({
          id: nanoid(),
          userId: input.userId,
          type: input.type,
          title: input.title,
          content: input.content,
          relatedRoomId: input.relatedRoomId,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
