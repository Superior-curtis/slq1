/**
 * Pornhub 網站爬蟲
 * 從 Pornhub.com 獲取真實分類、視頻、圖片和演員信息
 */

import axios from "axios";
import * as cheerio from "cheerio";

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

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const axiosInstance = axios.create({
  headers: {
    "User-Agent": USER_AGENT,
  },
  timeout: 20000,
});

// 分類快取
let categoriesCache: string[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 3600000; // 1 小時

/**
 * 獲取 Pornhub 分類列表
 */
export async function scrapeCategories(): Promise<string[]> {
  try {
    // 檢查快取
    if (categoriesCache && Date.now() - cacheTime < CACHE_DURATION) {
      console.log("[Pornhub Scraper] Using cached categories");
      return categoriesCache;
    }

    console.log("[Pornhub Scraper] Fetching categories from Pornhub...");

    const response = await axiosInstance.get("https://www.pornhub.com/categories");
    const $ = cheerio.load(response.data);

    const categories: Set<string> = new Set();

    // 方法 1: 從分類鏈接提取
    $("a[href*='/categories/']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const match = href.match(/\/categories\/([^/?]+)/);
        if (match) {
          const cat = match[1].replace(/-/g, " ").toLowerCase();
          if (cat.length > 0 && cat.length < 50) {
            categories.add(cat);
          }
        }
      }
    });

    // 方法 2: 從分類 div 提取
    $("div[class*='category'], li[class*='category']").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text && text.length > 0 && text.length < 50 && !text.includes("http")) {
        categories.add(text);
      }
    });

    // 方法 3: 從標籤提取
    $("span[class*='category'], a[class*='tag']").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text && text.length > 0 && text.length < 50) {
        categories.add(text);
      }
    });

    let result = Array.from(categories).filter((c) => c.length > 0);

    // 如果沒有找到，使用默認分類
    if (result.length === 0) {
      console.log("[Pornhub Scraper] No categories found, using defaults");
      result = [
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

    // 快取結果
    categoriesCache = result;
    cacheTime = Date.now();

    console.log(`[Pornhub Scraper] Found ${result.length} categories`);
    return result;
  } catch (error) {
    console.error("[Pornhub Scraper] Failed to scrape categories:", error);

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
 * 搜尋視頻
 */
export async function scrapeVideos(query: string, category?: string, count: number = 10): Promise<PornhubVideo[]> {
  try {
    console.log(`[Pornhub Scraper] Searching videos: "${query}" in category "${category || "all"}"`);

    let url = "https://www.pornhub.com/videos/search";
    const params: any = {
      search: query || "popular",
      o: "mr", // 按相關性排序
    };

    if (category && category !== "all") {
      params.c = category.replace(/ /g, "-");
    }

    const response = await axiosInstance.get(url, { params });
    const $ = cheerio.load(response.data);

    const videos: PornhubVideo[] = [];

    // 解析視頻卡片
    $("div[class*='videoBox'], li[class*='videoPreview']").each((_, el) => {
      if (videos.length >= count) return;

      try {
        const $el = $(el);

        // 提取視頻 URL 和 ID
        const href = $el.find("a").first().attr("href");
        if (!href) return;

        const videoIdMatch = href.match(/viewkey=([^&]+)/);
        if (!videoIdMatch) return;

        const videoId = videoIdMatch[1];
        const videoUrl = href.startsWith("http") ? href : `https://www.pornhub.com${href}`;

        // 提取標題
        const title = $el.find("a").first().attr("title") || $el.find("a").first().text().trim();
        if (!title || title.length === 0) return;

        // 提取縮圖
        const thumbnail = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";

        // 提取時長
        const durationText = $el.find("[class*='duration']").text().trim();
        const durationMatch = durationText.match(/(\d+):(\d+)/);
        const duration = durationMatch ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]) : 0;

        // 提取觀看次數
        const viewsText = $el.find("[class*='views']").text().trim();
        const viewsMatch = viewsText.match(/(\d+(?:,\d+)*)/);
        const views = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, "")) : 0;

        // 提取評分
        const ratingText = $el.find("[class*='rating']").text().trim();
        const ratingMatch = ratingText.match(/([\d.]+)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

        // 提取上傳日期
        const uploadDate = $el.find("[class*='date']").text().trim();

        // 提取演員
        const actors = extractActorsFromTitle(title);

        videos.push({
          id: videoId,
          title,
          url: videoUrl,
          thumbnail,
          duration,
          views,
          rating,
          uploadDate,
          actors,
          categories: category ? [category] : [],
        });
      } catch (error) {
        console.error("[Pornhub Scraper] Error parsing video:", error);
      }
    });

    console.log(`[Pornhub Scraper] Found ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error("[Pornhub Scraper] Failed to scrape videos:", error);
    return [];
  }
}

/**
 * 獲取隨機視頻
 */
export async function scrapeRandomVideos(category?: string, count: number = 5): Promise<PornhubVideo[]> {
  try {
    console.log(`[Pornhub Scraper] Fetching random videos in category "${category || "all"}"`);

    let url = "https://www.pornhub.com/videos";

    if (category && category !== "all") {
      url = `https://www.pornhub.com/categories/${category.replace(/ /g, "-")}`;
    }

    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);

    const videos: PornhubVideo[] = [];

    // 解析視頻卡片
    $("div[class*='videoBox'], li[class*='videoPreview']").each((_, el) => {
      if (videos.length >= count * 3) return; // 獲取更多以便隨機選擇

      try {
        const $el = $(el);

        // 提取視頻 URL 和 ID
        const href = $el.find("a").first().attr("href");
        if (!href) return;

        const videoIdMatch = href.match(/viewkey=([^&]+)/);
        if (!videoIdMatch) return;

        const videoId = videoIdMatch[1];
        const videoUrl = href.startsWith("http") ? href : `https://www.pornhub.com${href}`;

        // 提取標題
        const title = $el.find("a").first().attr("title") || $el.find("a").first().text().trim();
        if (!title || title.length === 0) return;

        // 提取縮圖
        const thumbnail = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";

        // 提取時長
        const durationText = $el.find("[class*='duration']").text().trim();
        const durationMatch = durationText.match(/(\d+):(\d+)/);
        const duration = durationMatch ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]) : 0;

        // 提取觀看次數
        const viewsText = $el.find("[class*='views']").text().trim();
        const viewsMatch = viewsText.match(/(\d+(?:,\d+)*)/);
        const views = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, "")) : 0;

        // 提取評分
        const ratingText = $el.find("[class*='rating']").text().trim();
        const ratingMatch = ratingText.match(/([\d.]+)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

        // 提取上傳日期
        const uploadDate = $el.find("[class*='date']").text().trim();

        // 提取演員
        const actors = extractActorsFromTitle(title);

        videos.push({
          id: videoId,
          title,
          url: videoUrl,
          thumbnail,
          duration,
          views,
          rating,
          uploadDate,
          actors,
          categories: category ? [category] : [],
        });
      } catch (error) {
        console.error("[Pornhub Scraper] Error parsing video:", error);
      }
    });

    // 隨機選擇
    const shuffled = videos.sort(() => Math.random() - 0.5).slice(0, count);

    console.log(`[Pornhub Scraper] Returning ${shuffled.length} random videos`);
    return shuffled;
  } catch (error) {
    console.error("[Pornhub Scraper] Failed to scrape random videos:", error);
    return [];
  }
}

/**
 * 從標題提取演員名稱
 */
function extractActorsFromTitle(title: string): string[] {
  // 嘗試從標題中提取演員名稱
  // 通常格式為: "Actor Name 1 and Actor Name 2 - Title"
  const parts = title.split(" - ");
  if (parts.length > 1) {
    const actorPart = parts[0];
    // 分割演員名稱
    const actors = actorPart
      .split(/\s+(?:and|with|feat|ft|featuring)\s+/i)
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && a.length < 50 && !a.includes("http"));
    if (actors.length > 0) {
      return actors;
    }
  }

  // 備選：嘗試提取大寫單詞作為名稱
  const words = title.split(" ");
  const actors: string[] = [];
  for (let i = 0; i < Math.min(3, words.length); i++) {
    const word = words[i];
    if (word.length > 2 && word[0] === word[0].toUpperCase() && !/[0-9]/.test(word)) {
      actors.push(word);
    }
  }

  if (actors.length > 0) {
    return actors;
  }

  // 最後備選：返回標題的第一部分
  return [title.split(" - ")[0].trim() || title];
}

/**
 * 獲取視頻詳情（包括演員信息）
 */
export async function scrapeVideoDetails(videoId: string): Promise<PornhubVideo | null> {
  try {
    console.log(`[Pornhub Scraper] Fetching video details: ${videoId}`);

    const url = `https://www.pornhub.com/view_video.php?viewkey=${videoId}`;
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);

    // 提取標題
    const title = $("h1").first().text().trim();
    if (!title || title.length === 0) return null;

    // 提取縮圖
    const thumbnail = $("img[class*='thumbnail']").first().attr("src") || "";

    // 提取時長
    const durationText = $("[class*='duration']").text().trim();
    const durationMatch = durationText.match(/(\d+):(\d+)/);
    const duration = durationMatch ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]) : 0;

    // 提取觀看次數
    const viewsText = $("[class*='views']").text().trim();
    const viewsMatch = viewsText.match(/(\d+(?:,\d+)*)/);
    const views = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, "")) : 0;

    // 提取評分
    const ratingText = $("[class*='rating']").text().trim();
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // 提取上傳日期
    const uploadDate = $("[class*='date']").text().trim();

    // 提取演員
    const actors: string[] = [];
    $("a[href*='/pornstar/'], a[class*='pornstar']").each((_, el) => {
      const name = $(el).text().trim();
      if (name && name.length > 0 && name.length < 50) {
        actors.push(name);
      }
    });

    // 如果沒有找到演員，從標題提取
    if (actors.length === 0) {
      actors.push(...extractActorsFromTitle(title));
    }

    // 提取分類
    const categories: string[] = [];
    $("a[href*='/categories/']").each((_, el) => {
      const cat = $(el).text().trim().toLowerCase();
      if (cat && cat.length > 0 && cat.length < 50) {
        categories.push(cat);
      }
    });

    return {
      id: videoId,
      title,
      url,
      thumbnail,
      duration,
      views,
      rating,
      uploadDate,
      actors,
      categories,
    };
  } catch (error) {
    console.error("[Pornhub Scraper] Failed to scrape video details:", error);
    return null;
  }
}
