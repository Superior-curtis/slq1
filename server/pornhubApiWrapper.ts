/**
 * Pornhub API Wrapper for Node.js
 * Wraps the Python Pornhub API for use in Node.js backend
 */

import axios from "axios";
import { nanoid } from "nanoid";
import type { Content } from "./contentManager";

const PORNHUB_API_BASE = "https://www.pornhub.com/api";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface PornhubVideo {
  video_id: string;
  title: string;
  duration: number;
  views: number;
  rating: number;
  actors: string[];
  categories: string[];
  thumb: string;
  url: string;
}

interface PornhubSearchResult {
  videos: PornhubVideo[];
  total: number;
}

/**
 * Search videos on Pornhub
 */
export async function searchPornhubVideos(query: string, limit: number = 20): Promise<Content[]> {
  try {
    const response = await axios.get(`${PORNHUB_API_BASE}/v2/videos/search`, {
      params: {
        search: query,
        limit,
        ordering: "newest",
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 15000,
    });

    const videos = response.data.videos || [];
    return videos.map((v: any) => convertToContent(v, "video"));
  } catch (error) {
    console.error("[Pornhub API] Search error:", error);
    return [];
  }
}

/**
 * Get videos by category
 */
export async function getPornhubVideosByCategory(category: string, limit: number = 20): Promise<Content[]> {
  try {
    const response = await axios.get(`${PORNHUB_API_BASE}/v2/videos/search`, {
      params: {
        search: category,
        limit,
        ordering: "newest",
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 15000,
    });

    const videos = response.data.videos || [];
    return videos.map((v: any) => convertToContent(v, "video"));
  } catch (error) {
    console.error("[Pornhub API] Category search error:", error);
    return [];
  }
}

/**
 * Get trending videos
 */
export async function getTrendingPornhubVideos(limit: number = 20): Promise<Content[]> {
  try {
    const response = await axios.get(`${PORNHUB_API_BASE}/v2/videos/search`, {
      params: {
        limit,
        ordering: "trending",
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 15000,
    });

    const videos = response.data.videos || [];
    return videos.map((v: any) => convertToContent(v, "video"));
  } catch (error) {
    console.error("[Pornhub API] Trending error:", error);
    return [];
  }
}

/**
 * Get popular videos
 */
export async function getPopularPornhubVideos(limit: number = 20): Promise<Content[]> {
  try {
    const response = await axios.get(`${PORNHUB_API_BASE}/v2/videos/search`, {
      params: {
        limit,
        ordering: "popular",
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 15000,
    });

    const videos = response.data.videos || [];
    return videos.map((v: any) => convertToContent(v, "video"));
  } catch (error) {
    console.error("[Pornhub API] Popular error:", error);
    return [];
  }
}

/**
 * Get video details
 */
export async function getPornhubVideoDetails(videoId: string): Promise<PornhubVideo | null> {
  try {
    const response = await axios.get(`${PORNHUB_API_BASE}/v2/videos/get`, {
      params: {
        video_id: videoId,
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 15000,
    });

    return response.data.video || null;
  } catch (error) {
    console.error("[Pornhub API] Get details error:", error);
    return null;
  }
}

/**
 * Get pornstars
 */
export async function getPornhubStars(limit: number = 20): Promise<any[]> {
  try {
    const response = await axios.get(`${PORNHUB_API_BASE}/v2/stars/search`, {
      params: {
        limit,
        ordering: "popular",
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 15000,
    });

    return response.data.stars || [];
  } catch (error) {
    console.error("[Pornhub API] Stars error:", error);
    return [];
  }
}

/**
 * Get videos by pornstar
 */
export async function getVideosByPornstar(pornstarName: string, limit: number = 20): Promise<Content[]> {
  try {
    const response = await axios.get(`${PORNHUB_API_BASE}/v2/videos/search`, {
      params: {
        search: pornstarName,
        limit,
        ordering: "newest",
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 15000,
    });

    const videos = response.data.videos || [];
    return videos.map((v: any) => convertToContent(v, "video"));
  } catch (error) {
    console.error("[Pornhub API] Pornstar videos error:", error);
    return [];
  }
}

/**
 * Convert Pornhub video to Content format
 */
function convertToContent(video: any, type: "picture" | "video"): Content {
  const actors = video.actors ? video.actors.split(",").map((a: string) => a.trim()) : [];
  const categories = video.categories ? video.categories.split(",").map((c: string) => c.trim()) : [];

  return {
    id: nanoid(),
    type,
    sourceId: video.video_id || video.id || nanoid(),
    sourceUrl: video.url || `https://www.pornhub.com/view_video.php?viewkey=${video.video_id}`,
    title: video.title || "Unknown",
    actors,
    categories,
    correctAnswers: actors.length > 0 ? actors : [video.title?.split("-")[0]?.trim() || "Unknown"],
    duration: video.duration || 0,
    thumbnail: video.thumb || video.thumbnail || "",
  };
}

/**
 * Get random video from Pornhub
 */
export async function getRandomPornhubVideo(): Promise<Content | null> {
  try {
    // Get trending videos and pick one randomly
    const videos = await getTrendingPornhubVideos(50);
    if (videos.length === 0) {
      return null;
    }
    return videos[Math.floor(Math.random() * videos.length)];
  } catch (error) {
    console.error("[Pornhub API] Random video error:", error);
    return null;
  }
}

/**
 * Get random video by category
 */
export async function getRandomPornhubVideoByCategory(category: string): Promise<Content | null> {
  try {
    const videos = await getPornhubVideosByCategory(category, 50);
    if (videos.length === 0) {
      return null;
    }
    return videos[Math.floor(Math.random() * videos.length)];
  } catch (error) {
    console.error("[Pornhub API] Random category video error:", error);
    return null;
  }
}

/**
 * Get Pornhub categories
 */
export async function getPornhubCategories(): Promise<string[]> {
  try {
    // Hardcoded popular categories since API might not have category endpoint
    return [
      "amateur",
      "anal",
      "asian",
      "bbw",
      "bdsm",
      "bisexual",
      "blonde",
      "blowjob",
      "bondage",
      "brunette",
      "creampie",
      "cumshot",
      "deepthroat",
      "dildo",
      "double-penetration",
      "ebony",
      "european",
      "facial",
      "fetish",
      "fisting",
      "gangbang",
      "gay",
      "granny",
      "group",
      "handjob",
      "hd",
      "homemade",
      "interracial",
      "japanese",
      "lesbian",
      "lingerie",
      "masturbation",
      "mature",
      "milf",
      "orgasm",
      "orgy",
      "pissing",
      "pornstar",
      "pov",
      "public",
      "redhead",
      "rough",
      "russian",
      "sex",
      "shemale",
      "small-tits",
      "solo",
      "squirt",
      "step-family",
      "striptease",
      "swallow",
      "teen",
      "threesome",
      "toys",
      "webcam",
      "trending",
      "famous-actor",
      "pornstars",
    ];
  } catch (error) {
    console.error("[Pornhub API] Categories error:", error);
    return [];
  }
}
