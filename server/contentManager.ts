/**
 * Content manager for handling adult content
 * Integrates with Pornhub-like sources
 */

import { nanoid } from "nanoid";

export interface Content {
  id: string;
  type: "picture" | "video";
  sourceId: string;
  sourceUrl: string;
  title: string;
  actors: string[];
  categories: string[];
  correctAnswers: string[];
  duration?: number; // for videos in seconds
  thumbnail?: string;
}

interface ContentCache {
  [key: string]: Content[];
}

// In-memory content cache
const contentCache: ContentCache = {
  all: [],
  pictures: [],
  videos: [],
};

// Available categories (synced from Pornhub)
export const AVAILABLE_CATEGORIES = [
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
];

const POPULAR_CATEGORIES = [
  "trending",
  "amateur",
  "anal",
  "asian",
  "blonde",
  "blowjob",
  "brunette",
  "creampie",
  "cumshot",
  "ebony",
  "fetish",
  "milf",
  "pov",
  "teen",
  "threesome",
  "pornstar",
];

/**
 * Add content to cache
 */
export function addContent(content: Content, categories: string[] = []): void {
  contentCache.all.push(content);

  if (content.type === "picture") {
    contentCache.pictures.push(content);
  } else {
    contentCache.videos.push(content);
  }

  // Add to category-specific caches
  for (const category of categories) {
    if (!contentCache[category]) {
      contentCache[category] = [];
    }
    contentCache[category].push(content);
  }
}

/**
 * Get random content
 */
export function getRandomContent(type?: "picture" | "video", category?: string): Content | null {
  let pool: Content[] = [];

  if (category && contentCache[category]) {
    pool = contentCache[category];
  } else if (type === "picture") {
    pool = contentCache.pictures;
  } else if (type === "video") {
    pool = contentCache.videos;
  } else {
    pool = contentCache.all;
  }

  if (pool.length === 0) {
    // Return mock content if cache is empty
    return generateMockContent(type, category);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get multiple random contents
 */
export function getRandomContents(count: number, type?: "picture" | "video", category?: string): Content[] {
  const contents: Content[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const content = getRandomContent(type, category);
    if (content && !seen.has(content.id)) {
      contents.push(content);
      seen.add(content.id);
    }
  }

  return contents;
}

/**
 * Generate mock content for demo purposes
 */
function generateMockContent(type?: "picture" | "video", category?: string): Content {
  const actors = ["Actor A", "Actor B", "Actor C"];
  const fallbackCategory = category || POPULAR_CATEGORIES[Math.floor(Math.random() * POPULAR_CATEGORIES.length)] || "amateur";
  const categories = [fallbackCategory];

  return {
    id: nanoid(),
    type: type || (Math.random() > 0.5 ? "picture" : "video"),
    sourceId: `mock_${nanoid()}`,
    sourceUrl: "https://via.placeholder.com/640x480?text=Content",
    title: `Sample ${type || "Content"} - ${category || "General"}`,
    actors: [actors[Math.floor(Math.random() * actors.length)]],
    categories,
    correctAnswers: [actors[Math.floor(Math.random() * actors.length)]],
    duration: type === "video" ? Math.floor(Math.random() * 3600) + 60 : undefined,
    thumbnail: "https://via.placeholder.com/320x240?text=Thumbnail",
  };
}

/**
 * Initialize with sample content
 */
export function initializeSampleContent(): void {
  // Add sample contents
  const sampleActors = ["Mia Khalifa", "Sunny Leone", "Abella Danger", "Riley Reid", "Lana Rhoades"];

  for (let i = 0; i < 20; i++) {
    const actor = sampleActors[Math.floor(Math.random() * sampleActors.length)];
    const category = AVAILABLE_CATEGORIES[Math.floor(Math.random() * AVAILABLE_CATEGORIES.length)];
    const type = Math.random() > 0.5 ? "picture" : "video";

    addContent(
      {
        id: nanoid(),
        type: type as "picture" | "video",
        sourceId: `sample_${i}`,
        sourceUrl: `https://via.placeholder.com/640x480?text=Sample+${i}`,
        title: `Sample Content ${i} - ${actor}`,
        actors: [actor],
        categories: [category],
        correctAnswers: [actor],
        duration: type === "video" ? Math.floor(Math.random() * 3600) + 60 : undefined,
        thumbnail: `https://via.placeholder.com/320x240?text=Thumb+${i}`,
      },
      [category]
    );
  }
}

/**
 * Get content statistics
 */
export function getContentStats() {
  return {
    totalContent: contentCache.all.length,
    pictures: contentCache.pictures.length,
    videos: contentCache.videos.length,
    categories: Object.keys(contentCache).filter((k) => k !== "all" && k !== "pictures" && k !== "videos").length,
  };
}

/**
 * Clear all content
 */
export function clearAllContent(): void {
  Object.keys(contentCache).forEach((key) => {
    contentCache[key] = [];
  });
}
