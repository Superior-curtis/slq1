import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseEnabled, waitForFirebaseUser } from "./firebase";

type SharedUser = {
  id: number;
  uid: string;
  email: string;
  username: string;
  name: string;
  role: "user" | "admin";
  passwordHash?: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  correctAnswers: number;
  totalAnswers: number;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

type LobbyMessage = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
};

type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
};

type HighlightItem = {
  id: string;
  title: string;
  thumbnail: string;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  likes: number;
  createdAt: string;
};

type QueueItem = {
  userId: string;
  username: string;
  joinedAt: number;
  rating: number;
};

type HistoryItem = {
  id: string;
  userId: string;
  gameMode: "picture" | "video";
  roomType: "random" | "bot" | "duel";
  score: number;
  rank: number;
  result: "win" | "loss";
  createdAt: string;
};

const collectionNames = {
  users: "users",
  lobbyMessages: "lobbyMessages",
  notifications: "notifications",
  highlights: "highlights",
  queue: "queue",
  history: "history",
} as const;

function nowIso() {
  return new Date().toISOString();
}

async function getCurrentAuthUser() {
  return await waitForFirebaseUser();
}

async function readUsers(): Promise<SharedUser[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const snap = await getDocs(query(collection(db, collectionNames.users), orderBy("totalScore", "desc")));
    return snap.docs.map((document) => document.data() as SharedUser);
  } catch {
    return [];
  }
}

export async function upsertUserProfile(user: {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash?: string;
}) {
  const db = getFirebaseDb();
  if (!db) return null;

  const users = await readUsers();
  const existing = users.find((entry) => entry.uid === user.uid || entry.email === user.email);
  const next: SharedUser = {
    id: existing?.id ?? users.length + 1,
    uid: user.uid,
    email: user.email,
    username: user.username,
    name: user.displayName || user.username,
    role: existing?.role ?? "user",
    passwordHash: user.passwordHash ?? existing?.passwordHash,
    totalScore: existing?.totalScore ?? 0,
    gamesPlayed: existing?.gamesPlayed ?? 0,
    gamesWon: existing?.gamesWon ?? 0,
    correctAnswers: existing?.correctAnswers ?? 0,
    totalAnswers: existing?.totalAnswers ?? 0,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    lastSignedIn: nowIso(),
  };

  await setDoc(doc(db, collectionNames.users, user.uid), {
    ...next,
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastSignedIn: serverTimestamp(),
  });

  return next;
}

async function readCollection<T>(name: keyof typeof collectionNames, orderField?: string, limitCount = 50): Promise<T[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const ref = collection(db, collectionNames[name]);
    const q = orderField ? query(ref, orderBy(orderField, "desc"), limit(limitCount)) : query(ref, limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((document) => document.data() as T);
  } catch {
    return [];
  }
}

async function appendCollection<T extends { id: string }>(name: keyof typeof collectionNames, item: T) {
  const db = getFirebaseDb();
  if (!db) return item;
  try {
    await setDoc(doc(db, collectionNames[name], item.id), item);
  } catch {
    return item;
  }
  return item;
}

async function mergeCollectionDoc(name: keyof typeof collectionNames, id: string, patch: Record<string, unknown>) {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await updateDoc(doc(db, collectionNames[name], id), patch);
  } catch {
    return;
  }
}

async function seedIfEmpty() {
  const db = getFirebaseDb();
  if (!db) return;

  const currentUsers = await readUsers();
  if (currentUsers.length === 0) {
    await setDoc(doc(db, collectionNames.users, "demo-user"), {
      id: 1,
      uid: "demo-user",
      email: "demo@example.com",
      username: "demo",
      name: "Demo User",
      role: "user",
      totalScore: 12000,
      gamesPlayed: 48,
      gamesWon: 30,
      correctAnswers: 132,
      totalAnswers: 198,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSignedIn: serverTimestamp(),
    });
  }

  if ((await readCollection<LobbyMessage>("lobbyMessages")).length === 0) {
    await appendCollection("lobbyMessages", {
      id: `msg_${Date.now()}`,
      userId: "demo-user",
      userName: "Demo User",
      message: "Welcome to Firebase shared mode.",
      createdAt: nowIso(),
    });
  }

  if ((await readCollection<NotificationItem>("notifications")).length === 0) {
    await appendCollection("notifications", {
      id: `notif_${Date.now()}`,
      userId: "demo-user",
      type: "game_invite",
      title: "Firebase connected",
      content: "Shared data is now stored in Firestore.",
      isRead: false,
      createdAt: nowIso(),
    });
  }

  if ((await readCollection<HighlightItem>("highlights")).length === 0) {
    await appendCollection("highlights", {
      id: `hl_${Date.now()}`,
      title: "Shared Firebase highlight",
      thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
      player1Name: "Demo User",
      player2Name: "Curtis",
      player1Score: 850,
      player2Score: 760,
      likes: 12,
      createdAt: nowIso(),
    });
  }
}

async function getActiveUserProfile() {
  const authUser = await getCurrentAuthUser();
  if (!authUser?.uid || !authUser.email) return null;

  try {
    await seedIfEmpty();

    const users = await readUsers();
    const profile = users.find((entry) => entry.uid === authUser.uid || entry.email === authUser.email) ?? null;
    if (profile) return profile;
  } catch {
    // fall through to a synthetic profile below
  }

  return {
    id: 1,
    uid: authUser.uid,
    email: authUser.email,
    username: authUser.username,
    name: authUser.displayName,
    role: "user" as const,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastSignedIn: nowIso(),
  };
}

async function getLeaderboard(limitCount: number) {
  const users = await readUsers();
  return users
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limitCount)
    .map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      name: user.name,
      totalScore: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      winRate: user.gamesPlayed > 0 ? Number(((user.gamesWon / user.gamesPlayed) * 100).toFixed(1)) : 0,
    }));
}

async function addLobbyMessage(message: string) {
  const profile = await getActiveUserProfile();
  if (!profile) return null;

  const next: LobbyMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: profile.uid,
    userName: profile.name,
    message,
    createdAt: nowIso(),
  };

  await appendCollection("lobbyMessages", next);
  return next;
}

async function getLobbyStats() {
  const users = await readUsers();
  return {
    onlinePlayers: users.length,
    inGamePlayers: Math.max(1, Math.min(3, users.length - 1)),
    totalGamesPlayed: users.reduce((sum, user) => sum + user.gamesPlayed, 0),
  };
}

async function getTopPlayers(limitCount: number) {
  return await getLeaderboard(limitCount);
}

async function getHistory(limitCount: number) {
  const profile = await getActiveUserProfile();
  if (!profile) return [];

  const history = await readCollection<HistoryItem>("history", undefined, limitCount);
  const byUser = history.filter((item) => item.userId === profile.uid);
  if (byUser.length > 0) return byUser;

  return [
    {
      id: `history_${Date.now()}`,
      userId: profile.uid,
      gameMode: "video",
      roomType: "random",
      score: 850,
      rank: 1,
      result: "win",
      createdAt: nowIso(),
    },
  ];
}

async function getNotifications(limitCount: number) {
  const profile = await getActiveUserProfile();
  if (!profile) return [];
  const notifications = await readCollection<NotificationItem>("notifications", undefined, limitCount);
  return notifications.filter((item) => item.userId === profile.uid);
}

async function markNotificationRead(notificationId: string) {
  const db = getFirebaseDb();
  if (!db) return { success: true };
  await mergeCollectionDoc("notifications", notificationId, { isRead: true });
  return { success: true };
}

async function markAllNotificationsRead() {
  const profile = await getActiveUserProfile();
  if (!profile) return { success: true };
  const notifications = await getNotifications(100);
  await Promise.all(
    notifications.map((notification) => mergeCollectionDoc("notifications", notification.id, { isRead: true }))
  );
  return { success: true };
}

async function getHighlights(limitCount: number) {
  return await readCollection<HighlightItem>("highlights", undefined, limitCount);
}

async function likeHighlight(id: string) {
  const highlights = await getHighlights(20);
  const next = highlights.find((item) => item.id === id);
  if (next) {
    await mergeCollectionDoc("highlights", id, { likes: next.likes + 1 });
  }
  return { success: true };
}

export async function handleFirebasePath(path: string, input: any) {
  await seedIfEmpty();

  switch (path) {
    case "auth.me":
      return await getActiveUserProfile();
    case "auth.login":
    case "auth.register":
      return await getActiveUserProfile();
    case "auth.logout":
      return { success: true };

    case "lobby.getOnlinePlayers": {
      const users = await readUsers();
      return users.map((user) => ({ id: String(user.id), name: user.name, score: user.totalScore }));
    }
    case "lobby.getLobbyStats":
      return await getLobbyStats();
    case "lobby.getTopPlayers":
      return await getTopPlayers(input?.limit ?? 10);
    case "lobby.searchPlayers": {
      const users = await readUsers();
      return users
        .filter((user) => user.name.toLowerCase().includes(String(input?.query ?? "").toLowerCase()))
        .map((user) => ({ id: String(user.id), name: user.name, score: user.totalScore }));
    }
    case "chat.getLobbyMessages":
      return await readCollection<LobbyMessage>("lobbyMessages", undefined, input?.limit ?? 50);
    case "chat.sendLobbyMessage":
      return await addLobbyMessage(input?.message ?? "");

    case "leaderboard.getTopPlayers":
      return await getTopPlayers(input?.limit ?? 100);
    case "leaderboard.getPlayerRank": {
      const profile = await getActiveUserProfile();
      if (!profile) return null;
      return { rank: 1, userId: profile.id, name: profile.name, totalScore: profile.totalScore, percentile: 95 };
    }

    case "profile.getStats": {
      const profile = await getActiveUserProfile();
      if (!profile) return null;
      return {
        userId: profile.id,
        name: profile.name,
        totalScore: profile.totalScore,
        gamesPlayed: profile.gamesPlayed,
        gamesWon: profile.gamesWon,
        correctAnswers: profile.correctAnswers,
        totalAnswers: profile.totalAnswers,
        winRate: profile.gamesPlayed > 0 ? Number(((profile.gamesWon / profile.gamesPlayed) * 100).toFixed(2)) : 0,
      };
    }
    case "profile.getHistory":
      return await getHistory(input?.limit ?? 10);

    case "notifications.getNotifications":
      return await getNotifications(input?.limit ?? 50);
    case "notifications.markAsRead":
      return await markNotificationRead(input?.notificationId);
    case "notifications.markAllAsRead":
      return await markAllNotificationsRead();

    case "highlights.getTopHighlights":
    case "highlights.getTrendingHighlights":
      return await getHighlights(input?.limit ?? 10);
    case "highlights.getHighlight":
      return (await getHighlights(50)).find((item) => item.id === input?.id) ?? null;
    case "highlights.likeHighlight":
      return await likeHighlight(input?.id);

    case "game.createRoom":
      return {
        id: `room_${Date.now()}`,
        roomCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
        roomType: input?.roomType ?? "random",
        gameMode: input?.gameMode ?? "picture",
        category: input?.category,
      };
    case "game.submitAnswer":
      return { isCorrect: Math.random() > 0.3, score: 500 };
    case "game.finishGame":
      return { success: true };

    case "matchmaking.joinQueue":
      return { success: true, queuePosition: 1, queueSize: 1 };
    case "matchmaking.leaveQueue":
      return { success: true };
    case "matchmaking.getQueueStatus":
      return { inQueue: false, queuePosition: 0, queueSize: 0, estimatedWaitTime: 0 };

    case "content.getCategories":
      return {
        success: true,
        data: [
          "amateur",
          "anal",
          "asian",
          "bbw",
          "bdsm",
          "blonde",
          "blowjob",
          "bondage",
          "brunette",
          "creampie",
          "cumshot",
          "deepthroat",
          "ebony",
          "fetish",
          "gangbang",
          "gay",
          "handjob",
          "hd",
          "homemade",
          "interracial",
          "lesbian",
          "milf",
          "mature",
          "orgasm",
          "pov",
          "redhead",
          "rough",
          "squirt",
          "teen",
          "threesome",
          "toys",
          "trending",
          "famous-actor",
          "pornstars",
        ],
      };
    case "content.getRandomVideos":
      const category = String(input?.category ?? "all").toLowerCase().replace(/\s+/g, "-");
      const isTrending = category === "trending";
      const isFamousActor = category === "famous-actor" || category === "pornstars" || category === "stars";
      const actorName = isTrending ? "Trending Star" : isFamousActor ? "Featured Star" : "Demo Performer";
      return {
        success: true,
        data: Array.from({ length: input?.count ?? 1 }, (_, index) => ({
          id: `vid_${Date.now()}_${index}`,
          title: `${isTrending ? "Trending" : isFamousActor ? "Featured Star" : "Firebase"} clip ${index + 1}`,
          thumbnail: `https://picsum.photos/seed/firebase-${category || "demo"}-${index}/800/450`,
          url: "https://example.com",
          actors: [actorName],
          categories: [input?.category ?? "demo"],
        })),
      };
    case "content.searchVideos":
      return { success: true, data: [] };
    case "content.getVideoById":
      return { success: true, data: null };

    case "bot.createBotPlayer":
      return { id: `bot_${input?.difficulty ?? "easy"}`, name: `${String(input?.difficulty ?? "easy").toUpperCase()} Bot`, difficulty: input?.difficulty ?? "easy" };
    case "bot.getBotAnswer":
      return { bot: { id: `bot_${input?.difficulty ?? "easy"}`, name: `${String(input?.difficulty ?? "easy").toUpperCase()} Bot`, difficulty: input?.difficulty ?? "easy" }, answer: input?.correctAnswers?.[0] ?? "Demo Answer" };

    case "quests.getTodayQuests":
      return [
        { id: "quest-1", title: "Win one round", reward: 50, completed: true },
        { id: "quest-2", title: "Send a lobby message", reward: 20, completed: false },
      ];
    case "quests.getUserQuestProgress":
      return { completed: 1, total: 2, reward: 50 };
    case "quests.completeQuest":
      return { success: true, completed: true };
    case "quests.getTotalQuestReward":
      return 50;

    case "voice.createVoiceRoom":
    case "voice.getVoiceConnections":
    case "voice.leaveVoiceRoom":
      return [];

    case "pornhub.searchVideos":
    case "pornhub.getVideosByCategory":
    case "pornhub.getTrendingVideos":
    case "pornhub.getPopularVideos":
      return [];
    case "pornhub.getCategories":
      return { success: true, data: ["amateur", "asian", "milf", "solo", "compilation"] };

    default:
      return { success: true };
  }
}

export function isFirebaseSharedMode() {
  return isFirebaseEnabled;
}
