import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Pornhub API 客戶端 - 調用 Python 包裝器
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

const pythonWrapperPath = path.resolve(__dirname, "pornhubPythonWrapper.py");

/**
 * 執行 Python 包裝器
 */
function executePythonWrapper(command: string, ...args: string[]): any {
  try {
    const cmd = `python3 "${pythonWrapperPath}" ${command} ${args.join(" ")}`;
    const output = execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(output);
  } catch (error) {
    console.error("[Pornhub Client] Error executing Python wrapper:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 獲取所有分類
 */
export async function getCategories(): Promise<PornhubCategory[]> {
  try {
    const result = executePythonWrapper("categories");
    if (result.success && result.data) {
      return result.data;
    }
    return [];
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
    const args = [query];
    if (category) {
      args.push(category);
    }
    args.push(String(count));

    const result = executePythonWrapper("search", ...args);
    if (result.success && result.data) {
      return result.data;
    }
    return [];
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
    const result = executePythonWrapper("video", videoId);
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error("[Pornhub Client] Failed to get video:", error);
    return null;
  }
}

/**
 * 獲取隨機影片
 */
export async function getRandomVideos(
  category?: string,
  count: number = 5
): Promise<PornhubVideo[]> {
  try {
    const args = [];
    if (category) {
      args.push(category);
    }
    args.push(String(count));

    const result = executePythonWrapper("random", ...args);
    if (result.success && result.data) {
      return result.data;
    }
    return [];
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
