# Vercel 環境變數配置

## 立即行動：在 Vercel 添加環境變數

1. **訪問 Vercel 項目**：https://vercel.com/curtis-chens-projects/porn-guesser/settings/environment-variables

2. **添加新變數**：
   - **名稱**：`VITE_BACKEND_URL`
   - **值**：*(暫時留空，等後端部署後填寫)*
   - **環境**：Production

3. **點擊 "Save"**

4. **重新部署**：
   ```bash
   git commit --allow-empty -m "Configure backend URL"
   git push origin main
   ```

## 後續：部署後端（必要）

後端需要部署到可公網訪問的地方。選項：

### 選項 A：Railway（推薦）
- 支援 Docker 部署（我們有 Dockerfile）
- 免費層：$5/月積分
- 步驟：
  1. 訪問 https://railway.app
  2. 點擊 "New Project" → "Deploy from GitHub"
  3. 選擇 `porn_guesser` 倉庫
  4. Railway 自動檢測 Dockerfile 並部署
  5. 複製部署 URL（如 `https://porn-guesser-xxx.railway.app`）
  6. 將 URL 設定到 Vercel 的 `VITE_BACKEND_URL`

### 選項 B：Render
- 類似 Railway，也有免費層
- URL: https://render.com

### 選項 C：本地暴露（測試用）
- 使用 ngrok 或 Cloudflare Tunnel 暴露本地後端
- 不適合長期使用

## 驗證

部署後端後，驗證連接：
```bash
curl https://your-backend-url.railway.app/api/trpc/content.getCategories
```

應返回分類列表（非 CORS 錯誤）。
