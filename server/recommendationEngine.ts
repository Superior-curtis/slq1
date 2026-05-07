/**
 * 推薦演算法系統
 * 根據玩家遊戲歷史和偏好推薦內容分類
 */

interface UserPreference {
  userId: string;
  categoryScores: Map<string, number>; // 分類評分
  totalGamesPlayed: number;
  favoriteCategories: string[];
  lastUpdated: number;
}

interface RecommendationResult {
  categories: string[];
  confidence: number; // 0-100
  reason: string;
}

const userPreferences = new Map<string, UserPreference>();

/**
 * 初始化用戶偏好
 */
export function initializeUserPreference(userId: string): UserPreference {
  if (userPreferences.has(userId)) {
    return userPreferences.get(userId)!;
  }

  const preference: UserPreference = {
    userId,
    categoryScores: new Map(),
    totalGamesPlayed: 0,
    favoriteCategories: [],
    lastUpdated: Date.now(),
  };

  userPreferences.set(userId, preference);
  return preference;
}

/**
 * 更新用戶偏好
 */
export function updateUserPreference(
  userId: string,
  category: string,
  score: number
): void {
  const preference = initializeUserPreference(userId);

  // 更新分類評分
  const currentScore = preference.categoryScores.get(category) || 0;
  const newScore = (currentScore + score) / 2; // 平均評分
  preference.categoryScores.set(category, newScore);

  // 更新遊戲次數
  preference.totalGamesPlayed++;

  // 更新最後更新時間
  preference.lastUpdated = Date.now();

  // 更新最喜歡的分類
  updateFavoriteCategories(preference);
}

/**
 * 更新最喜歡的分類
 */
function updateFavoriteCategories(preference: UserPreference): void {
  const sorted = Array.from(preference.categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => category);

  preference.favoriteCategories = sorted;
}

/**
 * 獲取用戶推薦
 */
export function getRecommendations(
  userId: string,
  allCategories: string[],
  count: number = 5
): RecommendationResult {
  const preference = initializeUserPreference(userId);

  // 如果用戶沒有足夠的遊戲歷史，返回隨機推薦
  if (preference.totalGamesPlayed < 3) {
    return {
      categories: getRandomCategories(allCategories, count),
      confidence: 30,
      reason: "基於隨機推薦（遊戲次數不足）",
    };
  }

  // 基於用戶偏好的推薦
  const recommendedCategories = getPreferenceBasedRecommendations(
    preference,
    allCategories,
    count
  );

  // 計算信心度
  const confidence = Math.min(
    100,
    Math.round((preference.totalGamesPlayed / 10) * 100)
  );

  return {
    categories: recommendedCategories,
    confidence,
    reason: `基於您的 ${preference.totalGamesPlayed} 場遊戲歷史推薦`,
  };
}

/**
 * 基於偏好的推薦
 */
function getPreferenceBasedRecommendations(
  preference: UserPreference,
  allCategories: string[],
  count: number
): string[] {
  const recommendations: string[] = [];

  // 首先添加最喜歡的分類
  for (const category of preference.favoriteCategories) {
    if (recommendations.length < count) {
      recommendations.push(category);
    }
  }

  // 如果還需要更多推薦，添加新的分類
  if (recommendations.length < count) {
    const newCategories = allCategories.filter(
      (cat) => !recommendations.includes(cat)
    );
    const randomNewCategories = getRandomCategories(newCategories, count - recommendations.length);
    recommendations.push(...randomNewCategories);
  }

  return recommendations.slice(0, count);
}

/**
 * 獲取隨機分類
 */
function getRandomCategories(categories: string[], count: number): string[] {
  const shuffled = [...categories].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, categories.length));
}

/**
 * 獲取趨勢分類
 */
export function getTrendingCategories(
  allCategories: string[],
  count: number = 5
): string[] {
  // 基於所有用戶的偏好計算趨勢
  const categoryPopularity = new Map<string, number>();

  userPreferences.forEach((preference) => {
    preference.categoryScores.forEach((score, category) => {
      const current = categoryPopularity.get(category) || 0;
      categoryPopularity.set(category, current + score);
    });
  });

  // 排序並返回最受歡迎的分類
  const trending = Array.from(categoryPopularity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([category]) => category);

  // 如果不足，補充其他分類
  if (trending.length < count) {
    const remaining = allCategories.filter((cat) => !trending.includes(cat));
    trending.push(...getRandomCategories(remaining, count - trending.length));
  }

  return trending.slice(0, count);
}

/**
 * 獲取用戶統計
 */
export function getUserStats(userId: string): {
  totalGames: number;
  favoriteCategories: string[];
  topCategory: string | null;
} {
  const preference = userPreferences.get(userId);

  if (!preference) {
    return {
      totalGames: 0,
      favoriteCategories: [],
      topCategory: null,
    };
  }

  const topCategory = preference.favoriteCategories[0] || null;

  return {
    totalGames: preference.totalGamesPlayed,
    favoriteCategories: preference.favoriteCategories,
    topCategory,
  };
}

/**
 * 清除用戶偏好
 */
export function clearUserPreference(userId: string): void {
  userPreferences.delete(userId);
}

/**
 * 獲取所有用戶偏好
 */
export function getAllUserPreferences(): UserPreference[] {
  return Array.from(userPreferences.values());
}
