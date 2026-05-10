/**
 * Pornhub 網站爬蟲
 * 從 Pornhub.com 獲取真實分類、視頻、圖片和演員信息
 */

import axios from "axios";
import * as cheerio from "cheerio";
import http from "http";
import https from "https";

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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Referer": "https://www.pornhub.com/",
  },
  timeout: 20000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

// 分類快取
let categoriesCache: string[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 300000; // 5分鐘 (改短便於測試)

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

    try {
      const response = await axiosInstance.get("https://www.pornhub.com/categories");
      const $ = cheerio.load(response.data);

      const categories: Set<string> = new Set();

      // 策略: 從category links的href提取 - Pornhub的主要分類列表
      $("a[href*='/categories/']").each((_, el) => {
        const href = $(el).attr("href");
        
        if (href && href.includes("/categories/")) {
          const match = href.match(/\/categories\/([^/?#]+)/);
          if (match) {
            const cat = match[1].replace(/-/g, " ").toLowerCase().trim();
            if (isValidCategory(cat)) {
              categories.add(cat);
            }
          }
        }
      });

      let result = Array.from(categories)
        .map((cat) => cat.trim().toLowerCase())
        .filter((cat) => cat.length > 0)
        .filter((cat, idx, arr) => arr.indexOf(cat) === idx); // Remove duplicates

      console.log(`[Pornhub Scraper] Extracted ${result.length} categories from href attributes`);
      
      if (result.length === 0) {
        console.log("[Pornhub Scraper] No categories found from href, using fallback list");
        result = [
          "amateur", "anal", "asian", "bbw", "blonde", "blowjob", "bondage", "brunette",
          "creampie", "cumshot", "ebony", "fetish", "gangbang", "gay", "hairy", "handjob",
          "hd", "homemade", "interracial", "lesbian", "mature", "milf", "orgasm", "pov",
          "redhead", "rough", "squirt", "teen", "threesome", "toys", "webcam",
          "trending", "popular", "hot", "new", "hentai", "babe", "college", "pornstar"
        ];
      } else {
        // Log first 20 categories for debugging
        console.log(`[Pornhub Scraper] Top categories: ${result.slice(0, 20).join(", ")}...`);
      }

      // 快取結果
      categoriesCache = result;
      cacheTime = Date.now();

      return result;
    } catch (scrapeError) {
      console.error("[Pornhub Scraper] HTML scrape failed:", scrapeError);
      
      // 返回默認分類作為備選
      return [
        "amateur", "anal", "asian", "bbw", "blonde", "blowjob", "bondage", "brunette",
        "creampie", "cumshot", "ebony", "fetish", "gangbang", "gay", "hairy", "handjob",
        "hd", "homemade", "interracial", "lesbian", "mature", "milf", "orgasm", "pov",
        "redhead", "rough", "squirt", "teen", "threesome", "toys", "webcam",
        "trending", "popular", "hot", "new", "hentai", "babe", "college", "pornstar"
      ];
    }
  } catch (error) {
    console.error("[Pornhub Scraper] Failed to scrape categories:", error);

    // 返回默認分類
    return [
      "amateur", "anal", "asian", "bbw", "blonde", "blowjob", "bondage", "brunette",
      "creampie", "cumshot", "ebony", "fetish", "gangbang", "gay", "hairy", "handjob",
      "hd", "homemade", "interracial", "lesbian", "mature", "milf", "orgasm", "pov",
      "redhead", "rough", "squirt", "teen", "threesome", "toys", "webcam",
      "trending", "popular", "hot", "new", "hentai", "babe", "college", "pornstar"
    ];
  }
}

/**
 * Helper function to validate if string is a valid category name
 */
function isValidCategory(cat: string): boolean {
  if (!cat || typeof cat !== "string") return false;
  const trimmed = cat.trim().toLowerCase();
  
  // Basic validations
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  if (!/^[a-z\s\-'&]+$/i.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (trimmed.length < 2) return false;
  
  // Must be 1-4 words max
  const words = trimmed.split(/\s+/).length;
  if (words > 4) return false;
  
  // Whitelist of known non-categories to explicitly exclude
  const blacklist = new Set([
    "hd porn", "gay porn", "trending", "popular", "new videos", 
    "home", "videos", "categories", "live", "cams", "pornstars", "discover",
    "logout", "login", "upload", "contact", "settings", "profile", "faq",
    "blog", "insights", "shop", "contest", "feed", "newsletter",
    "upgrade", "premium", "membership", "verified", "moderation", "dmca",
    "privacy", "terms", "cookies", "accessibility", "help", "support",
    "pornhub", "rss", "webmasters", "partners", "advertise", "press",
    "subscribe", "trending searches", "popular searches", "trust and safety",
    "content removal", "parental controls", "manage cookies", "cookie notice",
    "remove ads", "cancel anytime", "go back", "start now", "straight",
    "gay", "male", "female", "no ads", "exclusive content", "back log",
    "sign up", "remember me", "email", "password", "reset password",
    "section", "header", "footer", "menu", "item", "link", "button",
    "click here", "read more", "view more", "show more", "load more"
  ]);
  
  if (blacklist.has(trimmed)) return false;
  
  // Additional heuristics: 
  // Real categories are usually nouns or descriptive adjectives
  // Exclude words that are clearly UI elements or descriptors
  if (trimmed.includes("click") || trimmed.includes("view") || trimmed.includes("remove")) return false;
  if (trimmed === "and" || trimmed === "or" || trimmed === "the" || trimmed === "a") return false;
  if (trimmed === "section" || trimmed === "header" || trimmed === "footer") return false;
  if (trimmed.startsWith("- ") || trimmed.endsWith(" -")) return false;
  
  return true;
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
    const normalizedCategory = category ? category.replace(/\s+/g, "-").toLowerCase() : null;
    let url = "https://www.pornhub.com/videos";

    if (normalizedCategory && normalizedCategory !== "all" && normalizedCategory !== "trending") {
      url = `https://www.pornhub.com/categories/${normalizedCategory}`;
    }

    console.log(`[Pornhub Scraper] Fetching random videos from: ${url}`);

    const response = await axiosInstance.get(url, {
      timeout: 20000,
    });
    const $ = cheerio.load(response.data);

    const videos: PornhubVideo[] = [];

    // 嘗試多種選擇器獲取視頻卡片
    const selectors = [
      "div[class*='videoBox']",
      "li[class*='videoBox']",
      "div[data-video-id]",
      "li[data-video-id]",
      "a[href*='viewkey=']",
      "article[data-video-id]",
    ];

    for (const selector of selectors) {
      if (videos.length >= count * 2) break;

      $(selector).each((_, el) => {
        if (videos.length >= count * 2) return false;

        try {
          const $el = $(el);

          // 嘗試從多個位置提取href
          let href = $el.attr("href") || $el.find("a").first().attr("href");
          if (!href) {
            // 嘗試從data屬性
            const videoId = $el.attr("data-video-id");
            if (videoId) {
              href = `/view_video.php?viewkey=${videoId}`;
            }
          }

          if (!href) return true; // continue

          // 提取視頻ID
          let videoId = "";
          const viewkeyMatch = href.match(/viewkey=([a-z0-9]+)/i);
          if (viewkeyMatch) {
            videoId = viewkeyMatch[1];
          } else {
            videoId = $el.attr("data-video-id") || Math.random().toString(36).substring(2, 12);
          }

          if (!videoId) return true; // continue

          const videoUrl = href.startsWith("http") ? href : `https://www.pornhub.com${href}`;

          // 提取標題 - 嘗試多個位置
          let title =
            $el.find("a").first().attr("title") ||
            $el.attr("data-title") ||
            $el.find("h5, h4, .title, [class*='title']").first().text().trim() ||
            $el.find("a").first().text().trim();

          if (!title || title.length === 0) {
            title = `Video ${videoId}`;
          }

          // 提取縮圖
          const thumbnail =
            $el.find("img").first().attr("src") ||
            $el.find("img").first().attr("data-src") ||
            $el.attr("data-thumb") ||
            "";

          // 提取時長
          let duration = 0;
          const durationText = $el.find("[class*='duration'], .duration, [data-duration]").text().trim();
          const durationMatch = durationText.match(/(\d+):(\d+)/);
          if (durationMatch) {
            const mins = parseInt(durationMatch[1]);
            const secs = parseInt(durationMatch[2]);
            duration = mins * 60 + secs;
          }

          // 提取觀看次數
          let views = 0;
          const viewsText = $el.find("[class*='views'], .views").text().trim();
          const viewsMatch = viewsText.match(/(\d+(?:,\d+)*)/);
          if (viewsMatch) {
            views = parseInt(viewsMatch[1].replace(/,/g, ""));
          }

          // 提取評分
          let rating = 0;
          const ratingText = $el.find("[class*='rating'], .rating").text().trim();
          const ratingMatch = ratingText.match(/([\d.]+)/);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
          }

          // 提取上傳日期
          const uploadDate = $el.find("[class*='date'], .date").text().trim() || new Date().toISOString();

          // 提取演員名稱
          const actors = extractActorsFromTitle(title);

          // 只保存有效的視頻
          if (videoId && title && videoUrl) {
            videos.push({
              id: videoId,
              title,
              url: videoUrl,
              thumbnail,
              duration: duration || 600, // Default to 10 mins
              views,
              rating,
              uploadDate,
              actors,
              categories: normalizedCategory && normalizedCategory !== "all" ? [normalizedCategory.replace(/-/g, " ")] : [],
            });
          }
        } catch (error) {
          console.error("[Pornhub Scraper] Error parsing video element:", error);
        }
        return true; // continue
      });
    }

    // 隨機選擇並去重
    const uniqueVideos = Array.from(new Map(videos.map((v) => [v.id, v])).values());
    const shuffled = uniqueVideos.sort(() => Math.random() - 0.5).slice(0, count);

    console.log(`[Pornhub Scraper] Returning ${shuffled.length} random videos from ${videos.length} found`);
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

/**
 * 生成 fallback 視頻數據（當爬蟲失敗時）
 */
function generateFallbackVideos(category?: string, count: number = 5): PornhubVideo[] {
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

  const videos: PornhubVideo[] = [];

  for (let i = 0; i < count; i++) {
    const randomActors = [];
    for (let j = 0; j < Math.floor(Math.random() * 2) + 1; j++) {
      randomActors.push(actorsList[Math.floor(Math.random() * actorsList.length)]);
    }

    const videoId = `fallback_${Date.now()}_${i}`;
    videos.push({
      id: videoId,
      title: `${randomActors.join(" and ")} - ${category || "adult content"}`,
      url: `https://www.pornhub.com/view_video.php?viewkey=${videoId}`,
      thumbnail: `https://picsum.photos/seed/fallback-${i}/320/240`,
      duration: Math.floor(Math.random() * 3600) + 60,
      views: Math.floor(Math.random() * 1000000),
      rating: Math.floor(Math.random() * 100),
      uploadDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      actors: randomActors,
      categories: category ? [category] : [],
    });
  }

  console.log(`[Pornhub Scraper] Generated ${videos.length} fallback videos`);
  return videos;
}
