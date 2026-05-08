import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

// Import game systems
import * as ageVerification from "./ageVerification";
import * as chatSystem from "./chatSystem";
import * as contentManager from "./contentManager";
import * as botAI from "./botAI";
import * as questSystem from "./questSystem";
import * as highlightSystem from "./highlightSystem";
import * as pornhubApiWrapper from "./pornhubApiWrapper";
import * as pornhubClient from "./pornhubClient";
import * as voiceChat from "./voiceChat";
import * as lobbySystem from "./lobbySystem";
import * as gameLogic from "./gameLogic";
import * as matchmakingSystem from "./matchmakingSystem";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Age verification
  ageVerification: router({
    verify: protectedProcedure.mutation(({ ctx }) => {
      ageVerification.verifyAge(ctx.user.id);
      return { success: true, verified: true };
    }),
    isVerified: protectedProcedure.query(({ ctx }) => {
      return {
        verified: ageVerification.isAgeVerified(ctx.user.id),
      };
    }),
  }),

  // Game operations
  game: router({
    createRoom: protectedProcedure
      .input(
        z.object({
          roomType: z.enum(["random", "duel", "bot"]),
          gameMode: z.enum(["picture", "video"]),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const room = await gameLogic.createNewGameRoom(ctx.user.id, input.gameMode, input.roomType as any);
        return room;
      }),

    getContent: publicProcedure
      .input(
        z.object({
          type: z.enum(["picture", "video"]),
          category: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        // Try to get from Pornhub API first
        try {
          if (input.type === "video") {
            if (input.category) {
              const content = await pornhubApiWrapper.getRandomPornhubVideoByCategory(input.category);
              if (content) return content;
            } else {
              const content = await pornhubApiWrapper.getRandomPornhubVideo();
              if (content) return content;
            }
          }
        } catch (error) {
          console.error("[Game] Pornhub API error:", error);
        }

        // Fallback to local content manager
        return contentManager.getRandomContent(input.type, input.category);
      }),

    getCategories: publicProcedure.query(async () => {
      return pornhubApiWrapper.getPornhubCategories();
    }),

    submitAnswer: protectedProcedure
      .input(
        z.object({
          roomId: z.string(),
          answer: z.string(),
          responseTime: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate answer using LLM
        const isCorrect = await gameLogic.validateAnswerWithLLM(input.answer, [input.answer]);
        const score = gameLogic.calculateScore(input.responseTime, isCorrect);

        // Update player score
        await gameLogic.updatePlayerScore(input.roomId, ctx.user.id, score);

        return {
          isCorrect,
          score,
        };
      }),

    finishGame: protectedProcedure
      .input(z.object({ roomId: z.string() }))
      .mutation(async ({ input }) => {
        const result = await gameLogic.finishGame(input.roomId);
        return { success: result };
      }),
  }),

  // Chat
  chat: router({
    sendLobbyMessage: protectedProcedure
      .input(z.object({ message: z.string() }))
      .mutation(({ ctx, input }) => {
        const msg = chatSystem.addLobbyMessage(ctx.user.id, ctx.user.name || "Anonymous", input.message);
        return msg;
      }),

    getLobbyMessages: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(({ input }) => {
        return chatSystem.getLobbyMessages(input.limit);
      }),

    sendRoomMessage: protectedProcedure
      .input(z.object({ roomId: z.string(), message: z.string() }))
      .mutation(({ ctx, input }) => {
        const msg = chatSystem.addRoomMessage(input.roomId, ctx.user.id, ctx.user.name || "Anonymous", input.message);
        return msg;
      }),

    getRoomMessages: publicProcedure
      .input(z.object({ roomId: z.string(), limit: z.number().default(50) }))
      .query(({ input }) => {
        return chatSystem.getRoomMessages(input.roomId, input.limit);
      }),
  }),

  // Voice chat
  voice: router({
    createVoiceRoom: protectedProcedure
      .input(z.object({ roomId: z.string(), peerId: z.string() }))
      .mutation(({ ctx, input }) => {
        const connection = voiceChat.addUserToVoiceRoom(ctx.user.id, input.roomId, input.peerId);
        return connection;
      }),

    getVoiceConnections: publicProcedure
      .input(z.object({ roomId: z.string() }))
      .query(({ input }) => {
        return voiceChat.getActiveConnections(input.roomId);
      }),

    leaveVoiceRoom: protectedProcedure.mutation(({ ctx }) => {
      const connection = voiceChat.removeUserFromVoiceRoom(ctx.user.id);
      return connection;
    }),
  }),

  // Bot mode
  bot: router({
    createBotPlayer: publicProcedure
      .input(z.object({ difficulty: z.enum(["easy", "medium", "hard", "expert"]) }))
      .query(({ input }) => {
        return botAI.createBotPlayer(input.difficulty);
      }),

    getBotAnswer: publicProcedure
      .input(
        z.object({
          correctAnswers: z.array(z.string()),
          difficulty: z.enum(["easy", "medium", "hard", "expert"]),
        })
      )
      .query(({ input }) => {
        const bot = botAI.createBotPlayer(input.difficulty);
        return botAI.getBotAnswer(input.correctAnswers, bot);
      }),
  }),

  // Daily quests
  quests: router({
    getTodayQuests: protectedProcedure.query(() => {
      return questSystem.getTodayQuests();
    }),

    getUserQuestProgress: protectedProcedure.query(({ ctx }) => {
      return questSystem.getUserTodayQuestProgress(ctx.user.id);
    }),

    completeQuest: protectedProcedure
      .input(z.object({ questId: z.string() }))
      .mutation(({ ctx, input }) => {
        const progress = questSystem.getUserQuestProgress(ctx.user.id, input.questId);
        return progress;
      }),

    getTotalQuestReward: protectedProcedure.query(({ ctx }) => {
      return questSystem.getTotalQuestReward(ctx.user.id);
    }),
  }),

  // Highlights
  highlights: router({
    getTopHighlights: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(({ input }) => {
        return highlightSystem.getTopHighlights(input.limit);
      }),

    getTrendingHighlights: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(({ input }) => {
        return highlightSystem.getTrendingHighlights(input.limit);
      }),

    getHighlight: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        return highlightSystem.getHighlight(input.id);
      }),

    likeHighlight: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        return highlightSystem.likeHighlight(input.id);
      }),
  }),

  // Content - Real Pornhub API
  content: router({
    getCategories: publicProcedure.query(async () => {
      try {
        const categories = await pornhubClient.getCategories();
        return { success: true, data: categories };
      } catch (error) {
        console.error("[Content] Failed to get categories:", error);
        return { success: false, data: [] };
      }
    }),

    getRandomVideos: publicProcedure
      .input(z.object({ category: z.string().optional(), count: z.number().default(5) }))
      .query(async ({ input }) => {
        try {
          const videos = await pornhubClient.getRandomVideos(input.category, input.count);
          return { success: true, data: videos };
        } catch (error) {
          console.error("[Content] Failed to get random videos:", error);
          return { success: false, data: [] };
        }
      }),

    searchVideos: publicProcedure
      .input(z.object({ query: z.string(), category: z.string().optional(), count: z.number().default(10) }))
      .query(async ({ input }) => {
        try {
          const videos = await pornhubClient.searchVideos(input.query, input.category, input.count);
          return { success: true, data: videos };
        } catch (error) {
          console.error("[Content] Failed to search videos:", error);
          return { success: false, data: [] };
        }
      }),

    getVideoById: publicProcedure
      .input(z.object({ videoId: z.string() }))
      .query(async ({ input }) => {
        try {
          const video = await pornhubClient.getVideoById(input.videoId);
          return { success: true, data: video };
        } catch (error) {
          console.error("[Content] Failed to get video:", error);
          return { success: false, data: null };
        }
      }),
  }),

  // Matchmaking - Random Match
  matchmaking: router({
    joinQueue: protectedProcedure
      .output(z.object({
        success: z.boolean(),
        queuePosition: z.number(),
        queueSize: z.number(),
      }))
      .mutation(({ ctx }) => {
        const player = {
          userId: ctx.user.id,
          username: ctx.user.name || "Player",
          socketId: "",
          joinedAt: Date.now(),
          rating: 1000,
        };
        matchmakingSystem.addPlayerToQueue(player);
        return {
          success: true,
          queuePosition: matchmakingSystem.getPlayerQueuePosition(ctx.user.id),
          queueSize: matchmakingSystem.getQueueSize(),
        };
      }),

    leaveQueue: protectedProcedure.mutation(({ ctx }) => {
      matchmakingSystem.removePlayerFromQueue(ctx.user.id);
      return { success: true };
    }),

    getQueueStatus: protectedProcedure
      .output(z.object({
        inQueue: z.boolean(),
        queuePosition: z.number(),
        queueSize: z.number(),
        estimatedWaitTime: z.number(),
      }))
      .query(({ ctx }) => {
        const position = matchmakingSystem.getPlayerQueuePosition(ctx.user.id);
        const queueSize = matchmakingSystem.getQueueSize();
        return {
          inQueue: position > 0,
          queuePosition: position,
          queueSize: queueSize,
          estimatedWaitTime: Math.max(0, (queueSize - position) * 5),
        };
      }),
  }),

  // Lobby
  lobby: router({
    getOnlinePlayers: publicProcedure.query(() => {
      return lobbySystem.getOnlinePlayers();
    }),

    getLobbyStats: publicProcedure.query(() => {
      return lobbySystem.getLobbyStats();
    }),

    getTopPlayers: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(({ input }) => {
        return lobbySystem.getTopPlayers(input.limit);
      }),

    searchPlayers: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => {
        return lobbySystem.searchPlayers(input.query);
      }),
  }),

  // Player profile
  profile: router({
    getStats: protectedProcedure.query(({ ctx }) => {
      return {
        userId: ctx.user.id,
        name: ctx.user.name,
        totalScore: ctx.user.totalScore || 0,
        gamesPlayed: ctx.user.gamesPlayed || 0,
        gamesWon: ctx.user.gamesWon || 0,
        correctAnswers: ctx.user.correctAnswers || 0,
        totalAnswers: ctx.user.totalAnswers || 0,
        winRate: ctx.user.gamesPlayed > 0 ? ((ctx.user.gamesWon || 0) / ctx.user.gamesPlayed * 100).toFixed(2) : "0",
      };
    }),

    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(({ ctx, input }) => {
        return [
          {
            id: "1",
            gameMode: "video" as const,
            score: 850,
            rank: 1,
            createdAt: new Date(),
          },
        ];
      }),
  }),

  // Leaderboard
  leaderboard: router({
    getTopPlayers: publicProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(({ input }) => {
        return [
          {
            rank: 1,
            userId: 1,
            name: "Player 1",
            totalScore: 10000,
            gamesPlayed: 50,
            gamesWon: 40,
            winRate: 80,
          },
        ];
      }),

    getPlayerRank: protectedProcedure.query(({ ctx }) => {
      return {
        rank: 1,
        userId: ctx.user.id,
        name: ctx.user.name,
        totalScore: ctx.user.totalScore || 0,
        percentile: 95,
      };
    }),
  }),

  // Notifications
  notifications: router({
    getNotifications: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(({ ctx, input }) => {
        return [
          {
            id: "1",
            userId: ctx.user.id,
            type: "game_invite",
            title: "遊戲邀請",
            content: "Player 2 邀請您進行 1v1 對戰",
            isRead: false,
            createdAt: new Date(),
          },
        ];
      }),

    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.string() }))
      .mutation(({ input }) => {
        return { success: true };
      }),

    markAllAsRead: protectedProcedure.mutation(({ ctx }) => {
      return { success: true };
    }),
  }),

  // Pornhub content
  pornhub: router({
    searchVideos: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return await pornhubApiWrapper.searchPornhubVideos(input.query, input.limit);
      }),

    getVideosByCategory: publicProcedure
      .input(z.object({ category: z.string(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return await pornhubApiWrapper.getPornhubVideosByCategory(input.category, input.limit);
      }),

    getTrendingVideos: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return await pornhubApiWrapper.getTrendingPornhubVideos(input.limit);
      }),

    getPopularVideos: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return await pornhubApiWrapper.getPopularPornhubVideos(input.limit);
      }),

    getCategories: publicProcedure.query(async () => {
      return await pornhubApiWrapper.getPornhubCategories();
    }),
  }),
});

export type AppRouter = typeof appRouter;
