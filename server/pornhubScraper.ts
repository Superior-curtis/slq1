/**
 * Pornhub content scraper
 * Fetches real content from Pornhub
 * 
 * WARNING: This is for educational purposes only.
 * Ensure compliance with Pornhub's Terms of Service and local laws.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { nanoid } from "nanoid";
import type { Content } from "./contentManager";

const PORNHUB_BASE_URL = "https://www.pornhub.com";
const PORNHUB_API_URL = "https://api.pornhub.com";

// User agent to avoid being blocked
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

interface PornhubVideo {
  videoId: string;
  title: string;
  duration: number;
  views: number;
  rating: number;
  actors: string[];
  categories: string[];
  thumbnail: string;
  url: string;
}

/**
 * Fetch videos from Pornhub (using public API or scraping)
 * Note: This uses a simplified approach with mock data
 * In production, you would need to handle rate limiting, proxies, etc.
 */
export async function fetchPornhubVideos(category?: string, limit: number = 20): Promise<Content[]> {
  try {
    // Using a public Pornhub API endpoint (if available)
    // Otherwise, we'll use mock data
    const videos = await getMockPornhubVideos(category, limit);
    return videos;
  } catch (error) {
    console.error("[Pornhub Scraper] Error fetching videos:", error);
    return getMockPornhubVideos(category, limit);
  }
}

/**
 * Fetch pictures from Pornhub
 */
export async function fetchPornhubPictures(category?: string, limit: number = 20): Promise<Content[]> {
  try {
    const pictures = await getMockPornhubPictures(category, limit);
    return pictures;
  } catch (error) {
    console.error("[Pornhub Scraper] Error fetching pictures:", error);
    return getMockPornhubPictures(category, limit);
  }
}

/**
 * Get video details from Pornhub
 */
export async function getPornhubVideoDetails(videoId: string): Promise<PornhubVideo | null> {
  try {
    // Attempt to fetch from Pornhub
    const url = `${PORNHUB_BASE_URL}/view_video.php?viewkey=${videoId}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Extract video information
    const title = $('h1[class*="title"]').text().trim() || "Unknown Title";
    const duration = extractDuration($('span[class*="duration"]').text());
    const views = extractNumber($('span[class*="views"]').text());
    const rating = extractRating($('span[class*="rating"]').text());

    // Extract actors
    const actors: string[] = [];
    $('a[href*="/pornstar/"]').each((_, el) => {
      const actor = $(el).text().trim();
      if (actor) actors.push(actor);
    });

    // Extract categories
    const categories: string[] = [];
    $('a[href*="/categories/"]').each((_, el) => {
      const category = $(el).text().trim();
      if (category) categories.push(category.toLowerCase());
    });

    // Extract thumbnail
    const thumbnail = $('img[class*="thumbnail"]').attr("src") || "";

    return {
      videoId,
      title,
      duration,
      views,
      rating,
      actors: actors.slice(0, 5), // Limit to 5 actors
      categories: categories.slice(0, 5),
      thumbnail,
      url: `${PORNHUB_BASE_URL}/view_video.php?viewkey=${videoId}`,
    };
  } catch (error) {
    console.error(`[Pornhub Scraper] Error fetching video ${videoId}:`, error);
    return null;
  }
}

/**
 * Generate mock Pornhub videos for demo
 */
async function getMockPornhubVideos(category?: string, limit: number = 20): Promise<Content[]> {
  const mockActors = [
    "Mia Khalifa",
    "Sunny Leone",
    "Abella Danger",
    "Riley Reid",
    "Lana Rhoades",
    "Ava Addams",
    "Brandi Love",
    "Lisa Ann",
    "Jenna Jameson",
    "Sasha Grey",
  ];

  const mockCategories = [
    "amateur",
    "anal",
    "asian",
    "bbw",
    "bdsm",
    "bisexual",
    "blonde",
    "blowjob",
    "creampie",
    "cumshot",
    "deepthroat",
    "ebony",
    "gangbang",
    "lesbian",
    "milf",
    "pov",
    "rough",
    "teen",
    "threesome",
  ];

  const videos: Content[] = [];

  for (let i = 0; i < limit; i++) {
    const actor = mockActors[Math.floor(Math.random() * mockActors.length)];
    const selectedCategory = category || mockCategories[Math.floor(Math.random() * mockCategories.length)];
    const videoId = `mock_video_${nanoid()}`;

    videos.push({
      id: nanoid(),
      type: "video",
      sourceId: videoId,
      sourceUrl: `https://www.pornhub.com/view_video.php?viewkey=${videoId}`,
      title: `${actor} - ${selectedCategory} scene ${i + 1}`,
      actors: [actor],
      categories: [selectedCategory],
      correctAnswers: [actor],
      duration: Math.floor(Math.random() * 3600) + 60,
      thumbnail: `https://via.placeholder.com/320x240?text=Video+${i + 1}`,
    });
  }

  return videos;
}

/**
 * Generate mock Pornhub pictures for demo
 */
async function getMockPornhubPictures(category?: string, limit: number = 20): Promise<Content[]> {
  const mockActors = [
    "Mia Khalifa",
    "Sunny Leone",
    "Abella Danger",
    "Riley Reid",
    "Lana Rhoades",
    "Ava Addams",
    "Brandi Love",
    "Lisa Ann",
  ];

  const mockCategories = [
    "amateur",
    "anal",
    "asian",
    "bbw",
    "bdsm",
    "blonde",
    "blowjob",
    "creampie",
    "ebony",
    "lesbian",
    "milf",
    "pov",
    "teen",
  ];

  const pictures: Content[] = [];

  for (let i = 0; i < limit; i++) {
    const actor = mockActors[Math.floor(Math.random() * mockActors.length)];
    const selectedCategory = category || mockCategories[Math.floor(Math.random() * mockCategories.length)];
    const pictureId = `mock_picture_${nanoid()}`;

    pictures.push({
      id: nanoid(),
      type: "picture",
      sourceId: pictureId,
      sourceUrl: `https://via.placeholder.com/640x480?text=Picture+${i + 1}`,
      title: `${actor} - ${selectedCategory} picture ${i + 1}`,
      actors: [actor],
      categories: [selectedCategory],
      correctAnswers: [actor],
      thumbnail: `https://via.placeholder.com/320x240?text=Pic+${i + 1}`,
    });
  }

  return pictures;
}

/**
 * Helper functions to extract data from HTML
 */
function extractDuration(text: string): number {
  const match = text.match(/(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}

function extractNumber(text: string): number {
  const match = text.match(/(\d+(?:,\d+)*)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""));
  }
  return 0;
}

function extractRating(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

/**
 * Search Pornhub content
 */
export async function searchPornhubContent(query: string, type: "video" | "picture" = "video"): Promise<Content[]> {
  try {
    const searchUrl = `${PORNHUB_BASE_URL}/search?search=${encodeURIComponent(query)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results: Content[] = [];

    // Parse search results
    $("div[class*='videoPreview']").each((_, el) => {
      const title = $(el).find("h2").text().trim();
      const link = $(el).find("a").attr("href");
      const thumbnail = $(el).find("img").attr("src");

      if (title && link) {
        results.push({
          id: nanoid(),
          type,
          sourceId: link.split("viewkey=")[1] || nanoid(),
          sourceUrl: link,
          title,
          actors: [],
          categories: [],
          correctAnswers: [title.split("-")[0]?.trim() || ""],
          thumbnail,
        });
      }
    });

    return results;
  } catch (error) {
    console.error("[Pornhub Scraper] Error searching:", error);
    return [];
  }
}
