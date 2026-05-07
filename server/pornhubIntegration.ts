import axios from "axios";

/**
 * Pornhub API 整合模組
 * 使用非官方 API 獲取內容
 */

interface PornhubVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  views: number;
  rating: number;
  uploadDate: string;
  actors: string[];
  categories: string[];
}

interface PornhubCategory {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  videoCount: number;
}

// 快取系統
const videoCache = new Map<string, PornhubVideo[]>();
const categoryCache = new Map<string, PornhubCategory[]>();
const lastCacheUpdate = new Map<string, number>();

const CACHE_DURATION = 1000 * 60 * 60; // 1 小時

/**
 * 獲取 Pornhub 分類列表
 */
export async function getPornhubCategories(): Promise<PornhubCategory[]> {
  const cacheKey = "categories";
  const now = Date.now();

  // 檢查快取
  if (
    categoryCache.has(cacheKey) &&
    lastCacheUpdate.has(cacheKey) &&
    now - (lastCacheUpdate.get(cacheKey) || 0) < CACHE_DURATION
  ) {
    return categoryCache.get(cacheKey) || [];
  }

  try {
    // 模擬 Pornhub 分類
    const categories: PornhubCategory[] = [
      {
        id: "amateur",
        name: "Amateur",
        url: "https://www.pornhub.com/categories/amateur",
        thumbnail: "https://via.placeholder.com/300x200?text=Amateur",
        videoCount: 50000,
      },
      {
        id: "teen",
        name: "Teen",
        url: "https://www.pornhub.com/categories/teen",
        thumbnail: "https://via.placeholder.com/300x200?text=Teen",
        videoCount: 45000,
      },
      {
        id: "mature",
        name: "Mature",
        url: "https://www.pornhub.com/categories/mature",
        thumbnail: "https://via.placeholder.com/300x200?text=Mature",
        videoCount: 35000,
      },
      {
        id: "lesbian",
        name: "Lesbian",
        url: "https://www.pornhub.com/categories/lesbian",
        thumbnail: "https://via.placeholder.com/300x200?text=Lesbian",
        videoCount: 40000,
      },
      {
        id: "asian",
        name: "Asian",
        url: "https://www.pornhub.com/categories/asian",
        thumbnail: "https://via.placeholder.com/300x200?text=Asian",
        videoCount: 30000,
      },
      {
        id: "creampie",
        name: "Creampie",
        url: "https://www.pornhub.com/categories/creampie",
        thumbnail: "https://via.placeholder.com/300x200?text=Creampie",
        videoCount: 25000,
      },
      {
        id: "anal",
        name: "Anal",
        url: "https://www.pornhub.com/categories/anal",
        thumbnail: "https://via.placeholder.com/300x200?text=Anal",
        videoCount: 28000,
      },
      {
        id: "pov",
        name: "POV",
        url: "https://www.pornhub.com/categories/pov",
        thumbnail: "https://via.placeholder.com/300x200?text=POV",
        videoCount: 22000,
      },
    ];

    categoryCache.set(cacheKey, categories);
    lastCacheUpdate.set(cacheKey, now);
    return categories;
  } catch (error) {
    console.error("[Pornhub] Failed to fetch categories:", error);
    return [];
  }
}

/**
 * 按分類獲取隨機影片
 */
export async function getRandomVideosByCategory(
  category: string,
  count: number = 5
): Promise<PornhubVideo[]> {
  const cacheKey = `videos_${category}`;
  const now = Date.now();

  // 檢查快取
  if (
    videoCache.has(cacheKey) &&
    lastCacheUpdate.has(cacheKey) &&
    now - (lastCacheUpdate.get(cacheKey) || 0) < CACHE_DURATION
  ) {
    const cached = videoCache.get(cacheKey) || [];
    return cached.slice(0, count);
  }

  try {
    // 模擬 Pornhub 影片
    const videos: PornhubVideo[] = generateMockVideos(category, 20);

    videoCache.set(cacheKey, videos);
    lastCacheUpdate.set(cacheKey, now);
    return videos.slice(0, count);
  } catch (error) {
    console.error("[Pornhub] Failed to fetch videos:", error);
    return [];
  }
}

/**
 * 獲取隨機影片
 */
export async function getRandomVideos(count: number = 5): Promise<PornhubVideo[]> {
  try {
    const categories = await getPornhubCategories();
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];
    return getRandomVideosByCategory(randomCategory.id, count);
  } catch (error) {
    console.error("[Pornhub] Failed to get random videos:", error);
    return [];
  }
}

/**
 * 獲取隨機圖片
 */
export async function getRandomPictures(count: number = 5): Promise<string[]> {
  try {
    const pictures: string[] = [];
    for (let i = 0; i < count; i++) {
      pictures.push(
        `https://via.placeholder.com/600x400?text=Picture+${i + 1}`
      );
    }
    return pictures;
  } catch (error) {
    console.error("[Pornhub] Failed to get random pictures:", error);
    return [];
  }
}

/**
 * 生成模擬影片數據
 */
function generateMockVideos(category: string, count: number): PornhubVideo[] {
  const videos: PornhubVideo[] = [];
  const actors = [
    "Mia Khalifa",
    "Lena Paul",
    "Abella Danger",
    "Riley Reid",
    "Jada Stevens",
    "Ava Addams",
    "August Ames",
    "Brandi Love",
  ];

  for (let i = 0; i < count; i++) {
    const randomActors = actors.slice(0, Math.floor(Math.random() * 3) + 1);
    videos.push({
      id: `video_${category}_${i}`,
      title: `${category.toUpperCase()} Video ${i + 1}`,
      url: `https://www.pornhub.com/view_video.php?viewkey=video_${i}`,
      thumbnail: `https://via.placeholder.com/300x200?text=${category}+${i + 1}`,
      duration: Math.floor(Math.random() * 3600) + 600, // 10-60 分鐘
      views: Math.floor(Math.random() * 1000000) + 10000,
      rating: Math.floor(Math.random() * 100) + 50,
      uploadDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      actors: randomActors,
      categories: [category],
    });
  }

  return videos;
}

/**
 * 搜尋影片
 */
export async function searchVideos(query: string, count: number = 5): Promise<PornhubVideo[]> {
  try {
    // 模擬搜尋結果
    const videos: PornhubVideo[] = generateMockVideos(query, count);
    return videos;
  } catch (error) {
    console.error("[Pornhub] Failed to search videos:", error);
    return [];
  }
}

/**
 * 清除快取
 */
export function clearCache(): void {
  videoCache.clear();
  categoryCache.clear();
  lastCacheUpdate.clear();
}
