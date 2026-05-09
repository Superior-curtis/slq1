import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  json,
  decimal,
  boolean,
  index
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extended with game-specific fields.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Game-specific fields
  totalScore: int("totalScore").default(0).notNull(),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  gamesWon: int("gamesWon").default(0).notNull(),
  correctAnswers: int("correctAnswers").default(0).notNull(),
  totalAnswers: int("totalAnswers").default(0).notNull(),
  averageResponseTime: decimal("averageResponseTime", { precision: 10, scale: 2 }).default("0"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  scoreIdx: index("scoreIdx").on(table.totalScore),
  createdAtIdx: index("createdAtIdx").on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Game rooms for multiplayer matches
 */
export const gameRooms = mysqlTable("gameRooms", {
  id: varchar("id", { length: 64 }).primaryKey(), // UUID or nanoid
  roomCode: varchar("roomCode", { length: 12 }).notNull().unique(), // For invite-based mode
  roomType: mysqlEnum("roomType", ["random", "duel"]).notNull(), // random or duel
  gameMode: mysqlEnum("gameMode", ["picture", "video"]).notNull(), // picture or video
  
  creatorId: int("creatorId").notNull(),
  playerIds: json("playerIds").$type<number[]>().notNull().default(sql`json_array()`), // Array of player IDs
  maxPlayers: int("maxPlayers").default(2).notNull(),
  
  status: mysqlEnum("status", ["waiting", "active", "finished"]).default("waiting").notNull(),
  currentRound: int("currentRound").default(0).notNull(),
  totalRounds: int("totalRounds").default(5).notNull(),
  
  // Game state
  currentContent: json("currentContent").$type<{
    type: 'picture' | 'video';
    url: string;
    contentId: string;
    correctAnswers: string[];
  }>(),
  
  // Player scores in this room
  playerScores: json("playerScores").$type<Record<number, number>>().notNull().default(sql`json_object()`),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  finishedAt: timestamp("finishedAt"),
}, (table) => ({
  statusIdx: index("statusIdx").on(table.status),
  creatorIdx: index("creatorIdx").on(table.creatorId),
  createdAtIdx: index("createdAtIdx").on(table.createdAt),
}));

export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = typeof gameRooms.$inferInsert;

/**
 * Game history records for each completed game
 */
export const gameHistory = mysqlTable("gameHistory", {
  id: varchar("id", { length: 64 }).primaryKey(), // UUID or nanoid
  roomId: varchar("roomId", { length: 64 }).notNull(),
  
  playerId: int("playerId").notNull(),
  opponentIds: json("opponentIds").$type<number[]>().notNull().default(sql`json_array()`),
  
  gameMode: mysqlEnum("gameMode", ["picture", "video"]).notNull(),
  roomType: mysqlEnum("roomType", ["random", "duel"]).notNull(),
  
  score: int("score").notNull(),
  rank: int("rank").notNull(), // 1st, 2nd, 3rd, etc.
  correctAnswers: int("correctAnswers").notNull(),
  totalAnswers: int("totalAnswers").notNull(),
  averageResponseTime: decimal("averageResponseTime", { precision: 10, scale: 2 }).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  playerIdx: index("playerIdx").on(table.playerId),
  createdAtIdx: index("createdAtIdx").on(table.createdAt),
}));

export type GameHistory = typeof gameHistory.$inferSelect;
export type InsertGameHistory = typeof gameHistory.$inferInsert;

/**
 * Leaderboard cache (updated periodically)
 */
export const leaderboard = mysqlTable("leaderboard", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  rank: int("rank").notNull(),
  totalScore: int("totalScore").notNull(),
  gamesPlayed: int("gamesPlayed").notNull(),
  gamesWon: int("gamesWon").notNull(),
  winRate: decimal("winRate", { precision: 5, scale: 2 }).notNull(),
  
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  rankIdx: index("rankIdx").on(table.rank),
  userIdx: index("userIdx").on(table.userId),
}));

export type Leaderboard = typeof leaderboard.$inferSelect;
export type InsertLeaderboard = typeof leaderboard.$inferInsert;

/**
 * Notifications for players
 */
export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 64 }).primaryKey(), // UUID or nanoid
  userId: int("userId").notNull(),
  
  type: mysqlEnum("type", [
    "game_invite",
    "game_started",
    "game_finished",
    "rank_change",
    "new_challenge",
    "opponent_joined"
  ]).notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  
  // Related data
  relatedRoomId: varchar("relatedRoomId", { length: 64 }),
  relatedUserId: int("relatedUserId"),
  
  isRead: boolean("isRead").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
}, (table) => ({
  userIdx: index("userIdx").on(table.userId),
  isReadIdx: index("isReadIdx").on(table.isRead),
  createdAtIdx: index("createdAtIdx").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Content cache for pictures and videos
 */
export const contentCache = mysqlTable("contentCache", {
  id: varchar("id", { length: 64 }).primaryKey(), // UUID or nanoid
  contentType: mysqlEnum("contentType", ["picture", "video"]).notNull(),
  
  sourceId: varchar("sourceId", { length: 255 }).notNull(), // Pornhub video ID or similar
  sourceUrl: text("sourceUrl").notNull(),
  
  title: varchar("title", { length: 255 }),
  actors: json("actors").$type<string[]>().notNull().default(sql`json_array()`),
  categories: json("categories").$type<string[]>().notNull().default(sql`json_array()`),
  
  // For answer validation
  correctAnswers: json("correctAnswers").$type<string[]>().notNull().default(sql`json_array()`),
  
  cachedAt: timestamp("cachedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
}, (table) => ({
  sourceIdx: index("sourceIdx").on(table.sourceId),
  contentTypeIdx: index("contentTypeIdx").on(table.contentType),
}));

export type ContentCache = typeof contentCache.$inferSelect;
export type InsertContentCache = typeof contentCache.$inferInsert;

/**
 * Player connections for Socket.io tracking
 */
export const playerConnections = mysqlTable("playerConnections", {
  id: varchar("id", { length: 64 }).primaryKey(), // UUID or nanoid
  userId: int("userId").notNull(),
  socketId: varchar("socketId", { length: 255 }).notNull(),
  
  isConnected: boolean("isConnected").default(true).notNull(),
  currentRoomId: varchar("currentRoomId", { length: 64 }),
  
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("userIdx").on(table.userId),
  connectedIdx: index("connectedIdx").on(table.isConnected),
}));

export type PlayerConnection = typeof playerConnections.$inferSelect;
export type InsertPlayerConnection = typeof playerConnections.$inferInsert;
