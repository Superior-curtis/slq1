import { eq, desc, and, sql, lte, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  gameRooms,
  gameHistory,
  leaderboard,
  notifications,
  contentCache,
  playerConnections,
  GameRoom,
  GameHistory,
  Leaderboard,
  Notification,
  ContentCache,
  PlayerConnection
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Game Room queries
export async function createGameRoom(room: typeof gameRooms.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(gameRooms).values(room);
}

export async function getGameRoomById(roomId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getGameRoomByCode(roomCode: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(gameRooms).where(eq(gameRooms.roomCode, roomCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWaitingGameRooms(gameMode: 'picture' | 'video', limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(gameRooms)
    .where(
      and(
        eq(gameRooms.status, 'waiting'),
        eq(gameRooms.gameMode, gameMode),
        eq(gameRooms.roomType, 'random')
      )
    )
    .limit(limit);
}

export async function updateGameRoom(roomId: string, updates: Partial<typeof gameRooms.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(gameRooms).set(updates).where(eq(gameRooms.id, roomId));
}

// Game History queries
export async function createGameHistory(history: typeof gameHistory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(gameHistory).values(history);
}

export async function getUserGameHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(gameHistory)
    .where(eq(gameHistory.playerId, userId))
    .orderBy(desc(gameHistory.createdAt))
    .limit(limit);
}

// Leaderboard queries
export async function getTopLeaderboard(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(leaderboard)
    .orderBy(leaderboard.rank)
    .limit(limit);
}

export async function getUserLeaderboardRank(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(leaderboard)
    .where(eq(leaderboard.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateLeaderboard(userId: number, stats: {
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current rank
  const topPlayers = await db
    .select({ totalScore: users.totalScore })
    .from(users)
    .where(sql`${users.totalScore} > ${stats.totalScore}`)
    .orderBy(desc(users.totalScore));

  const rank = topPlayers.length + 1;

  await db
    .insert(leaderboard)
    .values({
      userId,
      rank,
      totalScore: stats.totalScore,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      winRate: String(stats.winRate) as any,
    })
    .onDuplicateKeyUpdate({
      set: {
        rank,
        totalScore: stats.totalScore,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        winRate: String(stats.winRate) as any,
      },
    });
}

// Notification queries
export async function createNotification(notification: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(notifications).values(notification);
}

export async function getUserNotifications(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationAsRead(notificationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// Content Cache queries
export async function getCachedContent(contentId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(contentCache)
    .where(eq(contentCache.id, contentId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function cacheContent(content: typeof contentCache.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(contentCache).values(content);
}

export async function getRandomContent(contentType: 'picture' | 'video') {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(contentCache)
    .where(eq(contentCache.contentType, contentType))
    .orderBy(sql`RAND()`)
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Player Connection queries
export async function createPlayerConnection(connection: typeof playerConnections.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(playerConnections).values(connection);
}

export async function getPlayerConnection(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(playerConnections)
    .where(eq(playerConnections.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updatePlayerConnection(userId: number, updates: Partial<typeof playerConnections.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(playerConnections).set(updates).where(eq(playerConnections.userId, userId));
}

export async function deletePlayerConnection(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(playerConnections).where(eq(playerConnections.userId, userId));
}
