import axios from "axios";
import { Express } from "express";

/**
 * Pornhub 媒體代理 - 解決跨域限制
 */

export function registerPornhubProxy(app: Express) {
  /**
   * 代理 Pornhub 圖片/縮圖
   * GET /api/proxy/pornhub/image?url=<encoded_url>
   */
  app.get("/api/proxy/pornhub/image", async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing or invalid url parameter" });
      }

      // 解碼 URL
      const decodedUrl = decodeURIComponent(url);

      // 驗證 URL 來自 Pornhub
      if (!decodedUrl.includes("pornhub") && !decodedUrl.includes("phncdn")) {
        return res.status(403).json({ error: "Only Pornhub URLs are allowed" });
      }

      // 獲取圖片
      const response = await axios.get(decodedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.pornhub.com/",
        },
        responseType: "arraybuffer",
        timeout: 10000,
      });

      // 設置 CORS 和緩存頭
      res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(response.data);
    } catch (error) {
      console.error("[Pornhub Proxy] Image proxy error:", error);
      res.status(500).json({ error: "Failed to proxy image" });
    }
  });

  /**
   * 代理 Pornhub 影片信息
   * GET /api/proxy/pornhub/video?url=<encoded_url>
   */
  app.get("/api/proxy/pornhub/video", async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing or invalid url parameter" });
      }

      const decodedUrl = decodeURIComponent(url);

      // 驗證 URL 來自 Pornhub
      if (!decodedUrl.includes("pornhub")) {
        return res.status(403).json({ error: "Only Pornhub URLs are allowed" });
      }

      // 返回 iframe 嵌入代碼
      const iframeHtml = `
        <iframe 
          src="${decodedUrl}" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          allow="autoplay; encrypted-media" 
          allowfullscreen
          style="border: none; border-radius: 8px;"
        ></iframe>
      `;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(iframeHtml);
    } catch (error) {
      console.error("[Pornhub Proxy] Video proxy error:", error);
      res.status(500).json({ error: "Failed to proxy video" });
    }
  });

  /**
   * 獲取 Pornhub 視頻流 URL
   * GET /api/proxy/pornhub/stream?videoId=<video_id>
   */
  app.get("/api/proxy/pornhub/stream", async (req, res) => {
    try {
      const { videoId } = req.query;
      
      if (!videoId || typeof videoId !== "string") {
        return res.status(400).json({ error: "Missing or invalid videoId parameter" });
      }

      // 構建 Pornhub 視頻頁面 URL
      const videoUrl = `https://www.pornhub.com/view_video.php?viewkey=${videoId}`;

      // 嘗試獲取視頻頁面
      const response = await axios.get(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      });

      // 簡單的正則表達式提取視頻信息
      const titleMatch = response.data.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const title = titleMatch ? titleMatch[1].trim() : "Unknown";

      // 返回視頻信息
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json({
        videoId,
        title,
        url: videoUrl,
        embedUrl: `https://www.pornhub.com/embed/${videoId}`,
      });
    } catch (error) {
      console.error("[Pornhub Proxy] Stream proxy error:", error);
      res.status(500).json({ error: "Failed to get video stream" });
    }
  });
}
