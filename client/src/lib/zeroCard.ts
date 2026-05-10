import superjson from "superjson";
import { handleFirebasePath, isFirebaseSharedMode } from "./firebaseShared";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" ? window.location.origin : import.meta.env.PROD ? "https://slq1-production.up.railway.app" : "");

export const ZERO_CARD_MODE =
  import.meta.env.VITE_ZERO_CARD_MODE === "true";

const STORAGE_KEYS = {
  users: "porn_guesser_zero_card_users",
  session: "porn_guesser_zero_card_session",
  lobbyMessages: "porn_guesser_zero_card_lobby_messages",
  notifications: "porn_guesser_zero_card_notifications",
  highlights: "porn_guesser_zero_card_highlights",
  rooms: "porn_guesser_zero_card_rooms",
  queue: "porn_guesser_zero_card_queue",
  history: "porn_guesser_zero_card_history",
} as const;

type ZeroCardUser = {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  role: "user" | "admin";
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  correctAnswers: number;
  totalAnswers: number;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

type ZeroCardLobbyMessage = {
  id: string;
  userId: number;
  userName: string;
  message: string;
  createdAt: string;
};

type ZeroCardNotification = {
  id: string;
  userId: number;
  type: "game_invite" | "game_started" | "game_finished" | "rank_change" | "new_challenge" | "opponent_joined";
  title: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
};

type ZeroCardHighlight = {
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

type ZeroCardRoom = {
  id: string;
  roomCode: string;
  roomType: string;
  gameMode: "picture" | "video";
  category?: string;
  createdAt: string;
};

type ZeroCardQueueItem = {
  userId: number;
  username: string;
  joinedAt: number;
  rating: number;
};

type ZeroCardHistory = {
  id: string;
  gameMode: "picture" | "video";
  roomType: "random" | "bot" | "duel";
  score: number;
  rank: number;
  createdAt: string;
  result: "win" | "loss";
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function seedUsers(): ZeroCardUser[] {
  return [
    {
      id: 1,
      username: "demo",
      name: "Demo User",
      email: "demo@example.com",
      role: "user",
      totalScore: 12000,
      gamesPlayed: 48,
      gamesWon: 30,
      correctAnswers: 132,
      totalAnswers: 198,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastSignedIn: nowIso(),
    },
    {
      id: 2,
      username: "curtis",
      name: "Curtis",
      email: "curtis@example.com",
      role: "user",
      totalScore: 9850,
      gamesPlayed: 36,
      gamesWon: 21,
      correctAnswers: 98,
      totalAnswers: 150,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastSignedIn: nowIso(),
    },
    {
      id: 3,
      username: "player3",
      name: "Player 3",
      email: "player3@example.com",
      role: "user",
      totalScore: 7800,
      gamesPlayed: 24,
      gamesWon: 11,
      correctAnswers: 72,
      totalAnswers: 124,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastSignedIn: nowIso(),
    },
  ];
}

function ensureSeedData() {
  if (typeof window === "undefined") return;

  if (!window.localStorage.getItem(STORAGE_KEYS.users)) {
    writeJson(STORAGE_KEYS.users, seedUsers());
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.lobbyMessages)) {
    writeJson<ZeroCardLobbyMessage[]>(STORAGE_KEYS.lobbyMessages, [
      {
        id: uid("msg"),
        userId: 1,
        userName: "Demo User",
        message: "Welcome to zero-card mode. Everything runs locally in the browser.",
        createdAt: nowIso(),
      },
    ]);
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.notifications)) {
    writeJson<ZeroCardNotification[]>(STORAGE_KEYS.notifications, [
      {
        id: uid("notif"),
        userId: 1,
        type: "game_invite",
        title: "Welcome",
        content: "This build runs without a paid backend.",
        isRead: false,
        createdAt: nowIso(),
      },
    ]);
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.highlights)) {
    writeJson<ZeroCardHighlight[]>(STORAGE_KEYS.highlights, [
      {
        id: uid("hl"),
        title: "Zero-card demo highlight",
        thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
        player1Name: "Demo User",
        player2Name: "Curtis",
        player1Score: 850,
        player2Score: 760,
        likes: 12,
        createdAt: nowIso(),
      },
    ]);
  }
}

function getUsers(): ZeroCardUser[] {
  ensureSeedData();
  return readJson<ZeroCardUser[]>(STORAGE_KEYS.users, seedUsers());
}

function setUsers(users: ZeroCardUser[]) {
  writeJson(STORAGE_KEYS.users, users);
}

function getSessionUser(): ZeroCardUser | null {
  ensureSeedData();
  const user = readJson<ZeroCardUser | null>(STORAGE_KEYS.session, null);
  return user ?? null;
}

function setSessionUser(user: ZeroCardUser | null) {
  writeJson(STORAGE_KEYS.session, user);
}

function upsertUser(username: string, _password: string, email?: string) {
  const users = getUsers();
  const existingIndex = users.findIndex((user) => user.username.toLowerCase() === username.toLowerCase());
  const userId = existingIndex >= 0 ? users[existingIndex]!.id : users.length + 1;
  const nextUser: ZeroCardUser = {
    id: userId,
    username,
    name: username,
    email: email ?? users[existingIndex]?.email ?? null,
    role: "user",
    totalScore: users[existingIndex]?.totalScore ?? 0,
    gamesPlayed: users[existingIndex]?.gamesPlayed ?? 0,
    gamesWon: users[existingIndex]?.gamesWon ?? 0,
    correctAnswers: users[existingIndex]?.correctAnswers ?? 0,
    totalAnswers: users[existingIndex]?.totalAnswers ?? 0,
    createdAt: users[existingIndex]?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    lastSignedIn: nowIso(),
  };

  if (existingIndex >= 0) {
    users[existingIndex] = nextUser;
  } else {
    users.unshift(nextUser);
  }

  setUsers(users);
  setSessionUser(nextUser);

  return nextUser;
}

function loginUser(username: string, password: string) {
  const users = getUsers();
  const user = users.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return upsertUser(username, password);
  }
  const updated = { ...user, lastSignedIn: nowIso(), updatedAt: nowIso() };
  users[users.findIndex((entry) => entry.id === user.id)] = updated;
  setUsers(users);
  setSessionUser(updated);
  return updated;
}

function logoutUser() {
  setSessionUser(null);
  return { success: true };
}

function getLeaderboardRows() {
  return getUsers()
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore)
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

function getUserStats(user: ZeroCardUser) {
  return {
    userId: user.id,
    name: user.name,
    totalScore: user.totalScore,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    correctAnswers: user.correctAnswers,
    totalAnswers: user.totalAnswers,
    winRate: user.gamesPlayed > 0 ? Number(((user.gamesWon / user.gamesPlayed) * 100).toFixed(2)) : 0,
  };
}

function getHistory(limit: number) {
  const history = readJson<ZeroCardHistory[]>(STORAGE_KEYS.history, []);
  if (history.length > 0) return history.slice(0, limit);
  return [
    {
      id: uid("history"),
      gameMode: "video",
      roomType: "random",
      score: 850,
      rank: 1,
      createdAt: nowIso(),
      result: "win",
    },
  ].slice(0, limit);
}

function getLobbyMessages(limit: number) {
  return readJson<ZeroCardLobbyMessage[]>(STORAGE_KEYS.lobbyMessages, []).slice(-limit);
}

function addLobbyMessage(message: string) {
  const user = getSessionUser() ?? getUsers()[0]!;
  const messages = getLobbyMessages(1000);
  const next = {
    id: uid("msg"),
    userId: user.id,
    userName: user.name,
    message,
    createdAt: nowIso(),
  } satisfies ZeroCardLobbyMessage;
  messages.push(next);
  writeJson(STORAGE_KEYS.lobbyMessages, messages.slice(-100));
  return next;
}

function getNotifications(limit: number) {
  return readJson<ZeroCardNotification[]>(STORAGE_KEYS.notifications, []).slice(0, limit);
}

function markNotificationRead(notificationId: string) {
  const notifications = readJson<ZeroCardNotification[]>(STORAGE_KEYS.notifications, []);
  const next = notifications.map((notification) =>
    notification.id === notificationId ? { ...notification, isRead: true } : notification
  );
  writeJson(STORAGE_KEYS.notifications, next);
  return { success: true };
}

function markAllNotificationsRead() {
  const notifications = readJson<ZeroCardNotification[]>(STORAGE_KEYS.notifications, []);
  writeJson(
    STORAGE_KEYS.notifications,
    notifications.map((notification) => ({ ...notification, isRead: true }))
  );
  return { success: true };
}

function getHighlights(limit: number) {
  return readJson<ZeroCardHighlight[]>(STORAGE_KEYS.highlights, []).slice(0, limit);
}

function likeHighlight(id: string) {
  const highlights = readJson<ZeroCardHighlight[]>(STORAGE_KEYS.highlights, []);
  const next = highlights.map((highlight) =>
    highlight.id === id ? { ...highlight, likes: highlight.likes + 1 } : highlight
  );
  writeJson(STORAGE_KEYS.highlights, next);
  return { success: true };
}

function getCategories() {
  const categories = [
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
  ];

  return {
    success: true,
    data: categories,
  };
}

function getRandomActors(): string[] {
  const actorsList = [
    "Mia Khalifa",
    "Sunny Leone",
    "Riley Reid",
    "Lana Rhoades",
    "Abella Danger",
    "Angela White",
    "Ava Addams",
    "Lisa Ann",
    "Eva Lovia",
    "Stormy Daniels",
  ];
  const count = Math.floor(Math.random() * 2) + 1;
  const selected = [];
  for (let i = 0; i < count; i++) {
    const actor = actorsList[Math.floor(Math.random() * actorsList.length)];
    if (!selected.includes(actor)) {
      selected.push(actor);
    }
  }
  return selected.length > 0 ? selected : ["Unknown"];
}

function randomVideo(category?: string) {
  const seed = category ?? "all";
  const id = uid("video");
  const actors = getRandomActors();
  const normalizedCategory = seed.toLowerCase().replace(/\s+/g, "-");
  const isTrending = normalizedCategory === "trending";
  const isFamousActor = normalizedCategory === "famous-actor" || normalizedCategory === "pornstars" || normalizedCategory === "stars";
  const titlePrefix = isTrending ? "Trending" : isFamousActor ? "Featured Star" : seed;
  return {
    id,
    title: `${titlePrefix} sample clip`,
    thumbnail: `https://picsum.photos/seed/${encodeURIComponent(seed)}-${id}/800/450`,
    url: `https://example.com/${id}`,
    actors,
    categories: category ? [category] : ["demo"],
    sourceId: id,
    sourceUrl: `https://example.com/${id}`,
    correctAnswers: actors,
  };
}

function getRandomVideos(category?: string, count = 1) {
  return {
    success: true,
    data: Array.from({ length: count }, () => randomVideo(category)),
  };
}

function searchVideos(query: string, category?: string, count = 5) {
  return {
    success: true,
    data: Array.from({ length: count }, (_, index) => ({
      ...randomVideo(category),
      title: `${query} result ${index + 1}`,
    })),
  };
}

function getVideoById(videoId: string) {
  return { success: true, data: { ...randomVideo(), id: videoId } };
}

function getGameRoom(roomType: string, gameMode: "picture" | "video", category?: string) {
  const room: ZeroCardRoom = {
    id: uid("room"),
    roomCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    roomType,
    gameMode,
    category,
    createdAt: nowIso(),
  };

  const rooms = readJson<ZeroCardRoom[]>(STORAGE_KEYS.rooms, []);
  rooms.unshift(room);
  writeJson(STORAGE_KEYS.rooms, rooms.slice(0, 20));
  return room;
}

function submitAnswer(_roomId: string, _answer: string, responseTime: number) {
  const user = getSessionUser() ?? getUsers()[0]!;
  const correct = Math.random() > 0.3;
  const score = Math.max(100, 1000 - Math.floor(responseTime / 10));
  const users = getUsers();
  const userIndex = users.findIndex((entry) => entry.id === user.id);

  if (userIndex >= 0) {
    const next = {
      ...users[userIndex]!,
      totalScore: users[userIndex]!.totalScore + (correct ? score : 0),
      gamesPlayed: users[userIndex]!.gamesPlayed + 1,
      gamesWon: users[userIndex]!.gamesWon + (correct ? 1 : 0),
      correctAnswers: users[userIndex]!.correctAnswers + (correct ? 1 : 0),
      totalAnswers: users[userIndex]!.totalAnswers + 1,
      updatedAt: nowIso(),
    };
    users[userIndex] = next;
    setUsers(users);
    setSessionUser(next);
  }

  const history = readJson<ZeroCardHistory[]>(STORAGE_KEYS.history, []);
  history.unshift({
    id: uid("history"),
    gameMode: "video",
    roomType: "random",
    score: correct ? score : 0,
    rank: correct ? 1 : 2,
    createdAt: nowIso(),
    result: correct ? "win" : "loss",
  });
  writeJson(STORAGE_KEYS.history, history.slice(0, 50));

  return { isCorrect: correct, score };
}

function joinQueue() {
  const user = getSessionUser() ?? getUsers()[0]!;
  const queue = readJson<ZeroCardQueueItem[]>(STORAGE_KEYS.queue, []);
  if (!queue.find((entry) => entry.userId === user.id)) {
    queue.push({
      userId: user.id,
      username: user.username,
      joinedAt: Date.now(),
      rating: 1000,
    });
  }
  writeJson(STORAGE_KEYS.queue, queue);
  return {
    success: true,
    queuePosition: queue.findIndex((entry) => entry.userId === user.id) + 1,
    queueSize: queue.length,
  };
}

function leaveQueue() {
  const user = getSessionUser() ?? getUsers()[0]!;
  const queue = readJson<ZeroCardQueueItem[]>(STORAGE_KEYS.queue, []);
  writeJson(STORAGE_KEYS.queue, queue.filter((entry) => entry.userId !== user.id));
  return { success: true };
}

function getQueueStatus() {
  const user = getSessionUser() ?? getUsers()[0]!;
  const queue = readJson<ZeroCardQueueItem[]>(STORAGE_KEYS.queue, []);
  const position = queue.findIndex((entry) => entry.userId === user.id) + 1;
  return {
    inQueue: position > 0,
    queuePosition: position > 0 ? position : 0,
    queueSize: queue.length,
    estimatedWaitTime: Math.max(0, (queue.length - position) * 5),
  };
}

function getLobbyStats() {
  const users = getUsers();
  return {
    onlinePlayers: users.length,
    inGamePlayers: Math.max(1, Math.min(3, users.length - 1)),
    totalGamesPlayed: users.reduce((sum, user) => sum + user.gamesPlayed, 0),
  };
}

function getTopPlayers(limit: number) {
  return getLeaderboardRows().slice(0, limit);
}

function getOnlinePlayers() {
  return getUsers().map((user) => ({
    id: String(user.id),
    name: user.name,
    score: user.totalScore,
  }));
}

function createBotPlayer(difficulty: string) {
  return {
    id: `bot_${difficulty}`,
    name: `${difficulty.toUpperCase()} Bot`,
    difficulty,
  };
}

function getBotAnswer(correctAnswers: string[], difficulty: string) {
  return {
    bot: createBotPlayer(difficulty),
    answer: correctAnswers[0] ?? "Demo Answer",
  };
}

function getTodayQuests() {
  return [
    { id: "quest-1", title: "Win one round", reward: 50, completed: true },
    { id: "quest-2", title: "Send a lobby message", reward: 20, completed: false },
  ];
}

function getUserQuestProgress() {
  return { completed: 1, total: 2, reward: 50 };
}

function completeQuest() {
  return { success: true, completed: true };
}

function getTotalQuestReward() {
  return 50;
}

function getVoiceConnections() {
  return [];
}

function createVoiceRoom() {
  return { success: true };
}

function leaveVoiceRoom() {
  return { success: true };
}

function getPornhubContent(limit: number) {
  return Array.from({ length: limit }, (_, index) => ({
    id: uid("ph"),
    title: `Demo video ${index + 1}`,
    thumbnail: `https://picsum.photos/seed/ph-${index + 1}/600/400`,
    url: `https://example.com/ph-${index + 1}`,
    actors: ["Demo Performer"],
    categories: ["demo"],
  }));
}

function handlePath(path: string, input: any) {
  const sessionUser = getSessionUser();

  switch (path) {
    case "auth.me":
      return sessionUser;
    case "auth.login":
      return loginUser(input.username, input.password);
    case "auth.register":
      return upsertUser(input.username, input.password, input.email);
    case "auth.logout":
      return logoutUser();

    case "content.getCategories":
      return getCategories();
    case "content.getRandomVideos":
      return getRandomVideos(input?.category, input?.count ?? 1);
    case "content.searchVideos":
      return searchVideos(input?.query ?? "demo", input?.category, input?.count ?? 10);
    case "content.getVideoById":
      return getVideoById(input?.videoId ?? uid("video"));

    case "game.createRoom":
      return getGameRoom(input?.roomType ?? "random", input?.gameMode ?? "picture", input?.category);
    case "game.submitAnswer":
      return submitAnswer(input?.roomId ?? uid("room"), input?.answer ?? "", input?.responseTime ?? 0);
    case "game.finishGame":
      return { success: true };

    case "matchmaking.joinQueue":
      return joinQueue();
    case "matchmaking.leaveQueue":
      return leaveQueue();
    case "matchmaking.getQueueStatus":
      return getQueueStatus();

    case "lobby.getOnlinePlayers":
      return getOnlinePlayers();
    case "lobby.getLobbyStats":
      return getLobbyStats();
    case "lobby.getTopPlayers":
      return getTopPlayers(input?.limit ?? 10);
    case "lobby.searchPlayers":
      return getOnlinePlayers().filter((player) => player.name.toLowerCase().includes(String(input?.query ?? "").toLowerCase()));

    case "profile.getStats":
      return sessionUser ? getUserStats(sessionUser) : null;
    case "profile.getHistory":
      return getHistory(input?.limit ?? 10);

    case "leaderboard.getTopPlayers":
      return getTopPlayers(input?.limit ?? 100);
    case "leaderboard.getPlayerRank":
      return sessionUser
        ? { rank: 1, userId: sessionUser.id, name: sessionUser.name, totalScore: sessionUser.totalScore, percentile: 95 }
        : null;

    case "notifications.getNotifications":
      return sessionUser ? getNotifications(input?.limit ?? 50) : [];
    case "notifications.markAsRead":
      return markNotificationRead(input?.notificationId);
    case "notifications.markAllAsRead":
      return markAllNotificationsRead();

    case "highlights.getTopHighlights":
    case "highlights.getTrendingHighlights":
      return getHighlights(input?.limit ?? 10);
    case "highlights.getHighlight":
      return getHighlights(20).find((highlight) => highlight.id === input?.id) ?? null;
    case "highlights.likeHighlight":
      return likeHighlight(input?.id);

    case "chat.getLobbyMessages":
      return getLobbyMessages(input?.limit ?? 50);
    case "chat.sendLobbyMessage":
      return addLobbyMessage(input?.message ?? "");
    case "chat.getRoomMessages":
      return [];
    case "chat.sendRoomMessage":
      return { success: true };

    case "bot.createBotPlayer":
      return createBotPlayer(input?.difficulty ?? "easy");
    case "bot.getBotAnswer":
      return getBotAnswer(input?.correctAnswers ?? [], input?.difficulty ?? "easy");

    case "quests.getTodayQuests":
      return getTodayQuests();
    case "quests.getUserQuestProgress":
      return getUserQuestProgress();
    case "quests.completeQuest":
      return completeQuest();
    case "quests.getTotalQuestReward":
      return getTotalQuestReward();

    case "voice.createVoiceRoom":
      return createVoiceRoom();
    case "voice.getVoiceConnections":
      return getVoiceConnections();
    case "voice.leaveVoiceRoom":
      return leaveVoiceRoom();

    case "pornhub.searchVideos":
      return getPornhubContent(input?.limit ?? 20);
    case "pornhub.getVideosByCategory":
      return getPornhubContent(input?.limit ?? 20);
    case "pornhub.getTrendingVideos":
      return getPornhubContent(input?.limit ?? 20);
    case "pornhub.getPopularVideos":
      return getPornhubContent(input?.limit ?? 20);
    case "pornhub.getCategories":
      return getCategories();

    default:
      return { success: true };
  }
}

function normalizeInput(value: any) {
  if (value && typeof value === "object" && "json" in value) {
    return (value as { json: unknown }).json;
  }
  return value;
}

function parseInputs(pathnames: string[], url: URL, init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase();
  const batchInput = url.searchParams.get("input");

  if (batchInput) {
    try {
      const parsed = JSON.parse(batchInput);
      if (pathnames.length > 1 && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return pathnames.map((_, index) => normalizeInput(parsed[String(index)] ?? parsed[index] ?? parsed));
      }
      return [normalizeInput(parsed)];
    } catch {
      return pathnames.map(() => undefined);
    }
  }

  if (method === "POST" && init?.body) {
    try {
      const body = typeof init.body === "string" ? init.body : JSON.stringify(init.body);
      const parsed = JSON.parse(body);
      if (pathnames.length > 1 && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return pathnames.map((_, index) => normalizeInput(parsed[String(index)] ?? parsed[index] ?? parsed));
      }
      return [normalizeInput(parsed)];
    } catch {
      return pathnames.map(() => undefined);
    }
  }

  return pathnames.map(() => undefined);
}

async function createMockResponse(paths: string[], inputs: any[]) {
  const envelopes = [] as Array<{ result: { data: ReturnType<typeof superjson.serialize> } }>;

  for (const [index, path] of paths.entries()) {
    const result = isFirebaseSharedMode()
      ? await handleFirebasePath(path, inputs[index])
      : handlePath(path, inputs[index]);

    envelopes.push({
      result: {
        data: superjson.serialize(result),
      },
    });
  }

  const body = JSON.stringify(envelopes.length === 1 ? envelopes[0] : envelopes);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function zeroCardFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestUrl = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
    window.location.origin
  );

  if (!requestUrl.pathname.startsWith("/api/trpc")) {
    return globalThis.fetch(input, init);
  }

  ensureSeedData();

  const pathPart = requestUrl.pathname.replace(/^\/api\/trpc\/?/, "");
  const paths = pathPart.split(",").filter(Boolean);
  const inputs = parseInputs(paths, requestUrl, init);

  return await createMockResponse(paths, inputs);
}

export function getZeroCardCurrentUser(): ZeroCardUser | null {
  return getSessionUser();
}

export function getZeroCardContentImageUrl(thumbnail: string) {
  return thumbnail;
}
