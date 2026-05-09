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

type MemoryUser = InsertUser & {
  id: number;
  username?: string | null;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

const memoryUsers: MemoryUser[] = [];
let memoryUserId = 1;
const memoryGameRooms: GameRoom[] = [];
const memoryGameHistory: GameHistory[] = [];
const memoryLeaderboard: Leaderboard[] = [];
const memoryNotifications: Notification[] = [];
const memoryContentCache: ContentCache[] = [];
const memoryPlayerConnections: PlayerConnection[] = [];

function now() {
  return new Date();
}

function toDate(value: unknown, fallback = now()) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function upsertMemoryUser(user: InsertUser): MemoryUser {
  const existing = memoryUsers.find(
    (entry) => entry.openId === user.openId || (user.username && entry.username?.toLowerCase() === user.username.toLowerCase())
  );

  const next: MemoryUser = {
    id: existing?.id ?? memoryUserId++,
    openId: user.openId,
    username: user.username ?? existing?.username ?? null,
    passwordHash: user.passwordHash ?? existing?.passwordHash ?? null,
    name: user.name ?? existing?.name ?? null,
    email: user.email ?? existing?.email ?? null,
    loginMethod: user.loginMethod ?? existing?.loginMethod ?? null,
    role: user.role ?? existing?.role ?? "user",
    totalScore: user.totalScore ?? existing?.totalScore ?? 0,
    gamesPlayed: user.gamesPlayed ?? existing?.gamesPlayed ?? 0,
    gamesWon: user.gamesWon ?? existing?.gamesWon ?? 0,
    correctAnswers: user.correctAnswers ?? existing?.correctAnswers ?? 0,
    totalAnswers: user.totalAnswers ?? existing?.totalAnswers ?? 0,
    averageResponseTime: user.averageResponseTime ?? existing?.averageResponseTime ?? "0",
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    lastSignedIn: user.lastSignedIn ? toDate(user.lastSignedIn) : existing?.lastSignedIn ?? now(),
  };

  const index = memoryUsers.findIndex((entry) => entry.id === next.id || entry.openId === next.openId);
  if (index >= 0) {
    memoryUsers[index] = next;
  } else {
    memoryUsers.unshift(next);
  }

  return next;
}

function upsertById<T extends { id: string | number }>(collection: T[], item: T) {
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    collection[index] = item;
  } else {
    collection.unshift(item);
  }
  return item;
}

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

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  return memoryUsers.find((user) => user.username?.toLowerCase() === username.toLowerCase());
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    upsertMemoryUser(user);
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
    return memoryUsers.find((user) => user.openId === openId);
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return memoryUsers.find((user) => user.id === id);

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Game Room queries
export async function createGameRoom(room: typeof gameRooms.$inferInsert) {
  const db = await getDb();
  if (!db) {
    upsertById(memoryGameRooms, {
      ...(room as GameRoom),
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: null,
    } as GameRoom);
    return;
  }

  await db.insert(gameRooms).values(room);
}

export async function getGameRoomById(roomId: string) {
  const db = await getDb();
  if (!db) return memoryGameRooms.find((room) => room.id === roomId);

  const result = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getGameRoomByCode(roomCode: string) {
  const db = await getDb();
  if (!db) return memoryGameRooms.find((room) => room.roomCode === roomCode);

  const result = await db.select().from(gameRooms).where(eq(gameRooms.roomCode, roomCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWaitingGameRooms(gameMode: 'picture' | 'video', limit: number = 5) {
  const db = await getDb();
  if (!db) {
    return memoryGameRooms
      .filter((room) => room.status === 'waiting' && room.gameMode === gameMode && room.roomType === 'random')
      .slice(0, limit);
  }

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
  if (!db) {
    const index = memoryGameRooms.findIndex((room) => room.id === roomId);
    if (index >= 0) {
      memoryGameRooms[index] = {
        ...memoryGameRooms[index],
        ...(updates as Partial<GameRoom>),
        updatedAt: new Date(),
      } as GameRoom;
    }
    return;
  }

  await db.update(gameRooms).set(updates).where(eq(gameRooms.id, roomId));
}

// Game History queries
export async function createGameHistory(history: typeof gameHistory.$inferInsert) {
  const db = await getDb();
  if (!db) {
    upsertById(memoryGameHistory, {
      ...(history as GameHistory),
      createdAt: history.createdAt ? new Date(history.createdAt as any) : new Date(),
    } as GameHistory);
    return;
  }

  await db.insert(gameHistory).values(history);
}

export async function getUserGameHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return memoryGameHistory.filter((history) => history.playerId === userId).slice(0, limit);

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
  if (!db) return memoryLeaderboard.slice().sort((a, b) => a.rank - b.rank).slice(0, limit);

  return await db
    .select()
    .from(leaderboard)
    .orderBy(leaderboard.rank)
    .limit(limit);
}

export async function getUserLeaderboardRank(userId: number) {
  const db = await getDb();
  if (!db) return memoryLeaderboard.find((entry) => entry.userId === userId);

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
  if (!db) {
    const rank = memoryUsers.filter((user) => Number(user.totalScore || 0) > stats.totalScore).length + 1;
    upsertById(memoryLeaderboard, {
      id: memoryLeaderboard.find((entry) => entry.userId === userId)?.id ?? memoryLeaderboard.length + 1,
      userId,
      rank,
      totalScore: stats.totalScore,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      winRate: String(stats.winRate) as any,
      updatedAt: new Date(),
    } as Leaderboard);
    return;
  }

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
  if (!db) {
    upsertById(memoryNotifications, {
      ...(notification as Notification),
      createdAt: notification.createdAt ? new Date(notification.createdAt as any) : new Date(),
    } as Notification);
    return;
  }

  await db.insert(notifications).values(notification);
}

export async function getUserNotifications(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return memoryNotifications.filter((notification) => notification.userId === userId).slice(0, limit);

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationAsRead(notificationId: string) {
  const db = await getDb();
  if (!db) {
    const index = memoryNotifications.findIndex((notification) => notification.id === notificationId);
    if (index >= 0) memoryNotifications[index] = { ...memoryNotifications[index], isRead: true };
    return;
  }

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) {
    for (let index = 0; index < memoryNotifications.length; index++) {
      if (memoryNotifications[index].userId === userId) {
        memoryNotifications[index] = { ...memoryNotifications[index], isRead: true };
      }
    }
    return;
  }

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// Content Cache queries
export async function getCachedContent(contentId: string) {
  const db = await getDb();
  if (!db) return memoryContentCache.find((content) => content.id === contentId);

  const result = await db
    .select()
    .from(contentCache)
    .where(eq(contentCache.id, contentId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function cacheContent(content: typeof contentCache.$inferInsert) {
  const db = await getDb();
  if (!db) {
    upsertById(memoryContentCache, {
      ...(content as ContentCache),
      cachedAt: content.cachedAt ? new Date(content.cachedAt as any) : new Date(),
      expiresAt: content.expiresAt ? new Date(content.expiresAt as any) : null,
    } as ContentCache);
    return;
  }

  await db.insert(contentCache).values(content);
}

export async function getRandomContent(contentType: 'picture' | 'video') {
  const db = await getDb();
  if (!db) return memoryContentCache.find((content) => content.contentType === contentType);

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
  if (!db) {
    upsertById(memoryPlayerConnections, {
      ...(connection as PlayerConnection),
      connectedAt: connection.connectedAt ? new Date(connection.connectedAt as any) : new Date(),
      lastActivityAt: connection.lastActivityAt ? new Date(connection.lastActivityAt as any) : new Date(),
    } as PlayerConnection);
    return;
  }

  await db.insert(playerConnections).values(connection);
}

export async function getPlayerConnection(userId: number) {
  const db = await getDb();
  if (!db) return memoryPlayerConnections.find((connection) => connection.userId === userId);

  const result = await db
    .select()
    .from(playerConnections)
    .where(eq(playerConnections.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updatePlayerConnection(userId: number, updates: Partial<typeof playerConnections.$inferInsert>) {
  const db = await getDb();
  if (!db) {
    const index = memoryPlayerConnections.findIndex((connection) => connection.userId === userId);
    if (index >= 0) {
      memoryPlayerConnections[index] = {
        ...memoryPlayerConnections[index],
        ...(updates as Partial<PlayerConnection>),
        lastActivityAt: new Date(),
      } as PlayerConnection;
    }
    return;
  }

  await db.update(playerConnections).set(updates).where(eq(playerConnections.userId, userId));
}

export async function deletePlayerConnection(userId: number) {
  const db = await getDb();
  if (!db) {
    for (let index = memoryPlayerConnections.length - 1; index >= 0; index--) {
      if (memoryPlayerConnections[index].userId === userId) {
        memoryPlayerConnections.splice(index, 1);
      }
    }
    return;
  }

  await db.delete(playerConnections).where(eq(playerConnections.userId, userId));
}
