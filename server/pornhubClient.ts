import * as scraper from "./pornhubScraper";
import * as pornhubApiWrapper from "./pornhubApiWrapper";

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
    const categories = await scraper.scrapeCategories();
    const specialCategories = ["trending", "famous-actor", "pornstars"];
    return Array.from(new Set([...categories, ...specialCategories]));
  } catch (error) {
    console.error("[Pornhub Client] Failed to get categories:", error);
    return ["trending", "famous-actor", "pornstars"];
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
    const normalizedCategory = category?.trim().toLowerCase().replace(/\s+/g, "-") ?? "all";

    if (normalizedCategory === "all" || normalizedCategory === "trending") {
      const trending = await pornhubApiWrapper.getTrendingPornhubVideos(Math.max(count * 2, 20));
      if (trending.length > 0) {
        return trending.sort(() => Math.random() - 0.5).slice(0, count) as unknown as PornhubVideo[];
      }

      return await scraper.scrapeRandomVideos(undefined, count);
    }

    if (
      normalizedCategory === "famous-actor" ||
      normalizedCategory === "pornstars" ||
      normalizedCategory === "stars"
    ) {
      const stars = await pornhubApiWrapper.getPornhubStars(Math.max(count * 2, 10));
      const starName = stars[0]?.name || stars[0]?.pornstar_name || stars[0]?.username || stars[0]?.title;

      if (starName) {
        const videos = await pornhubApiWrapper.getVideosByPornstar(String(starName), Math.max(count * 2, 10));
        if (videos.length > 0) {
          return videos.sort(() => Math.random() - 0.5).slice(0, count);
        }
      }

      return await scraper.scrapeRandomVideos(undefined, count);
    }

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
