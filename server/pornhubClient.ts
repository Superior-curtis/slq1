import * as scraper from "./pornhubScraper";

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

/**
 * 獲取所有分類
 */
export async function getCategories(): Promise<string[]> {
  try {
    return await scraper.scrapeCategories();
  } catch (error) {
    console.error("[Pornhub Client] Failed to get categories:", error);
    return [];
  }
}

/**
 * 搜尋影片
 */
export async function searchVideos(
  query: string,
  category?: string,
  count: number = 10
): Promise<PornhubVideo[]> {
  try {
    return await scraper.scrapeVideos(query, category, count);
  } catch (error) {
    console.error("[Pornhub Client] Failed to search videos:", error);
    return [];
  }
}

/**
 * 按 ID 獲取影片
 */
export async function getVideoById(videoId: string): Promise<PornhubVideo | null> {
  try {
    return await scraper.scrapeVideoDetails(videoId);
  } catch (error) {
    console.error("[Pornhub Client] Failed to get video:", error);
    return null;
  }
}

/**
 * 獲取隨機影片
 */
export async function getRandomVideos(category?: string, count: number = 5): Promise<PornhubVideo[]> {
  try {
    return await scraper.scrapeRandomVideos(category, count);
  } catch (error) {
    console.error("[Pornhub Client] Failed to get random videos:", error);
    return [];
  }
}

/**
 * 按分類獲取隨機影片
 */
export async function getRandomVideosByCategory(category: string, count: number = 5): Promise<PornhubVideo[]> {
  return getRandomVideos(category, count);
}
