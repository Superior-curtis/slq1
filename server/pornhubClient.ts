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

const DISCOVER_CATEGORY_ALIASES = new Map<string, string>([
  ["discover videos", "trending"],
  ["recommended", "trending"],
  ["hottest", "trending"],
  ["most viewed", "trending"],
  ["top rated", "trending"],
  ["popular homemade", "homemade"],
  ["shorties", "trending"],
  ["playlists", "trending"],
  ["channels", "trending"],
  ["random", "all"],
  ["newest", "all"],
  ["viewers' choice", "trending"],
]);

/**
 * 獲取所有分類
 */
export async function getCategories(): Promise<string[]> {
  try {
    // Use pornhubApiWrapper which has the full 140+ category list
    return await pornhubApiWrapper.getPornhubCategories();
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
    const normalizedInput = category?.trim().toLowerCase().replace(/\s+/g, "-") ?? "all";
    const normalizedCategory = DISCOVER_CATEGORY_ALIASES.get(normalizedInput.replace(/-/g, " ")) || normalizedInput;

    if (normalizedCategory === "all" || normalizedCategory === "trending") {
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

    // Many site categories 404 or resolve to empty lists; use the generic video feed as the playable fallback.
    const genericVideos = await scraper.scrapeRandomVideos(undefined, count);
    if (genericVideos.length > 0) {
      return genericVideos;
    }

    return await scraper.scrapeRandomVideos("trending", count);
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
