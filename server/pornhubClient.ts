import axios from "axios";

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

const PORNHUB_API_BASE = "https://www.pornhub.com/api";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const axiosInstance = axios.create({
  baseURL: PORNHUB_API_BASE,
  headers: {
    "User-Agent": USER_AGENT,
  },
  timeout: 15000,
});

/**
 * 獲取所有分類
 */
export async function getCategories(): Promise<string[]> {
  try {
    const response = await axiosInstance.get("/v2/categories/list", {
      params: {
        limit: 100,
      },
    });

    const categories = response.data?.categories || [];
    return categories.map((cat: any) => (typeof cat === "string" ? cat : cat.name || cat));
  } catch (error) {
    console.error("[Pornhub Client] Failed to get categories:", error);
    // 返回默認分類
    return [
      "amateur",
      "anal",
      "asian",
      "bbw",
      "blonde",
      "blowjob",
      "bondage",
      "brunette",
      "creampie",
      "cumshot",
      "ebony",
      "fetish",
      "gangbang",
      "gay",
      "hairy",
      "handjob",
      "hd",
      "homemade",
      "interracial",
      "lesbian",
      "mature",
      "milf",
      "orgasm",
      "pov",
      "redhead",
      "rough",
      "squirt",
      "teen",
      "threesome",
      "toys",
    ];
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
    const params: any = {
      search: query || "popular",
      limit: Math.min(count, 50),
      ordering: "newest",
    };

    if (category && category !== "all") {
      params.category = category;
    }

    const response = await axiosInstance.get("/v2/videos/search", { params });

    const videos = response.data?.videos || [];
    return videos.map((v: any) => ({
      id: v.video_id || v.id || "",
      title: v.title || "Unknown",
      url: v.url || `https://www.pornhub.com/view_video.php?viewkey=${v.video_id}`,
      thumbnail: v.thumb || v.thumbnail || "",
      duration: parseInt(v.duration) || 0,
      views: parseInt(v.views) || 0,
      rating: parseFloat(v.rating) || 0,
      uploadDate: v.upload_date || "",
      actors: Array.isArray(v.actors) ? v.actors : v.actors ? [v.actors] : [],
      categories: Array.isArray(v.categories) ? v.categories : v.categories ? [v.categories] : [],
    }));
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
    const response = await axiosInstance.get("/v2/videos/get", {
      params: {
        video_id: videoId,
      },
    });

    const v = response.data?.video;
    if (!v) return null;

    return {
      id: v.video_id || v.id || "",
      title: v.title || "Unknown",
      url: v.url || `https://www.pornhub.com/view_video.php?viewkey=${v.video_id}`,
      thumbnail: v.thumb || v.thumbnail || "",
      duration: parseInt(v.duration) || 0,
      views: parseInt(v.views) || 0,
      rating: parseFloat(v.rating) || 0,
      uploadDate: v.upload_date || "",
      actors: Array.isArray(v.actors) ? v.actors : v.actors ? [v.actors] : [],
      categories: Array.isArray(v.categories) ? v.categories : v.categories ? [v.categories] : [],
    };
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
    const params: any = {
      limit: Math.min(count * 2, 100),
      ordering: "trending",
    };

    if (category && category !== "all") {
      params.category = category;
    }

    const response = await axiosInstance.get("/v2/videos/search", { params });

    const videos = response.data?.videos || [];

    // 隨機選擇
    const shuffled = videos.sort(() => Math.random() - 0.5).slice(0, count);

    return shuffled.map((v: any) => ({
      id: v.video_id || v.id || "",
      title: v.title || "Unknown",
      url: v.url || `https://www.pornhub.com/view_video.php?viewkey=${v.video_id}`,
      thumbnail: v.thumb || v.thumbnail || "",
      duration: parseInt(v.duration) || 0,
      views: parseInt(v.views) || 0,
      rating: parseFloat(v.rating) || 0,
      uploadDate: v.upload_date || "",
      actors: Array.isArray(v.actors) ? v.actors : v.actors ? [v.actors] : [],
      categories: Array.isArray(v.categories) ? v.categories : v.categories ? [v.categories] : [],
    }));
  } catch (error) {
    console.error("[Pornhub Client] Failed to get random videos:", error);
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
  return getRandomVideos(category, count);
}
