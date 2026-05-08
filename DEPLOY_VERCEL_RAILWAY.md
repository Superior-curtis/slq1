# Porn Guesser - Vercel 前端 + Railway 後端部署指南

## 架構概述

```
┌─────────────────────────────────────────────────────────────┐
│                        用戶瀏覽器                              │
└────────────────┬──────────────────────────────┬──────────────┘
                 │                              │
         HTTP 請求（靜態資源）        HTTP/WebSocket 請求
                 │                              │
         ┌───────▼──────────┐           ┌──────▼──────────┐
         │  Vercel Hosting   │           │  Railway 後端    │
         │  (前端靜態部署)    │           │ (Node.js + Python)│
         │   dist/public     │           │  Socket.IO       │
         │                   │           │  數據庫連線       │
         └───────────────────┘           └──────────────────┘
```

## 預備條件

### 本機工具
- Node.js 22+
- pnpm
- Git
- Vercel CLI: `npm i -g vercel`
- Railway CLI: `npm i -g @railway/cli` （可選）

### 帳戶
- GitHub 帳戶（推送代碼）
- Vercel 帳戶（連結 GitHub 自動部署）
- Railway 帳戶（免費層足夠）

## 快速部署流程（5 分鐘）

### 第 1 步：推送代碼到 GitHub

```bash
cd porn_guesser
git add .
git commit -m "Add Vercel + Railway deployment config"
git push origin main
```

### 第 2 步：部署前端到 Vercel

**方式 A：CLI 方式（推薦開發者）**
```bash
npm i -g vercel
vercel login
vercel --prod
# 遵循提示選擇 GitHub 倉庫
```

**方式 B：UI 方式（推薦新手）**
1. 登入 [vercel.com](https://vercel.com)
2. 點擊 "Add New" → "Project"
3. 選擇 GitHub 倉庫 "porn_guesser"
4. 框架選擇 "Vite"，點擊部署
5. 部署完成後，複製前端 URL（例如 `https://porn-guesser.vercel.app`）

### 第 3 步：部署後端到 Railway

**方式 A：CLI 方式（推薦）**
```bash
npm i -g @railway/cli
railway login
railway init  # 建立新專案
railway up    # 部署
# 稍待 3-5 分鐘，複製生成的 URL
```

**方式 B：UI 方式**
1. 登入 [railway.app](https://railway.app)
2. 點擊 "New Project" → "Deploy from GitHub repo"
3. 選擇 GitHub 倉庫
4. Railway 將自動檢測 Dockerfile 並部署
5. 部署完成後，在 "Settings" → "Domain" 複製 URL

### 第 4 步：配置前端環境變數

在 Vercel 項目設定中，添加環境變數：

```bash
VITE_BACKEND_URL=https://porn-guesser-backend-xxxx.railway.app
```

**步驟**：
1. Vercel 項目頁面 → "Settings"
2. 左側選擇 "Environment Variables"
3. 新增：
   - 名稱：`VITE_BACKEND_URL`
   - 值：`https://your-railway-domain.railway.app`（替換成實際 URL）
4. 選擇環境：Production
5. 點擊 "Save"

### 第 5 步：重新部署前端

觸發 Vercel 重新部署以應用環境變數：

```bash
# 推送一個空提交
git commit --allow-empty -m "Redeploy to apply environment variables"
git push origin main

# 或在 Vercel 頁面手動重部署
```

## 成本估算（100% 免費）

### Vercel
- **免費層**：
  - 無限部署
  - 100GB 帶寬/月
  - 無冷啟動
  - 適合 SPA 應用

### Railway
- **免費層**：
  - $5 積分/月（約 100-200 小時運行時間）
  - 足夠小型應用 24/7 運行
  - 支援自定義域名
  - 自動備份數據庫

**超過免費額度**：按使用量計費，通常 $0.10/小時。

## 環境變數管理

### 開發環境
前端會讀取 `.env` 文件：
```bash
VITE_BACKEND_URL=http://localhost:8080
```

### 生產環境
在 Vercel 項目設定中設置：
```bash
VITE_BACKEND_URL=https://your-railway-domain.railway.app
```

### 後端環境變數
在 Railway 項目設定中設置：

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=mysql://user:pass@host:3306/db
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://oauth-server.com
OWNER_OPEN_ID=your-owner-id
```

**Railway 設置步驟**：
1. Railway 項目首頁
2. 選擇服務 → "porn-guesser"
3. 點擊 "Variables"
4. 添加環境變數

## 本機開發與測試

### 本機運行前端 + 本機後端

```bash
# 終端 1：啟動後端
npm run dev
# 後端運行在 http://localhost:8080

# 終端 2：啟動前端開發伺服器
cd client
npm run dev
# 前端運行在 http://localhost:5173
```

### 本機前端 + 遠端後端測試

```bash
# 設定環境變數指向遠端後端
export VITE_BACKEND_URL=https://your-railway-domain.railway.app

# 啟動前端開發伺服器
cd client
npm run dev
```

## 監控與日誌

### Vercel 日誌
```bash
# 使用 CLI 查看實時日誌
vercel logs
```

或在 Vercel 項目頁面 → "Deployments" 查看詳情。

### Railway 日誌
```bash
# 使用 CLI 查看日誌
railway logs

# 使用 UI：Railway 項目 → 服務 → "Logs"
```

## 故障排除

### 前端顯示白屏或 CORS 錯誤

**原因**：前端無法連線到後端

**排查**：
1. 檢查環境變數是否正確設置：
   ```bash
   vercel env pull  # 拉取 Vercel 變數
   ```
2. 檢查後端是否在運行：`curl https://your-railway-domain.railway.app/api/trpc`
3. 檢查 `client/src/main.tsx` 中的 API URL 配置

### Railway 服務無法啟動

**原因**：通常是環境變數缺失或依賴安裝失敗

**排查**：
1. 查看 Railway 日誌：`railway logs`
2. 檢查 Dockerfile：確保 `PORT=8080` 已設置
3. 檢查 `package.json` 中的 `start` 命令：`npm run build && npm run start`

### 數據庫連線失敗

確保 `DATABASE_URL` 環境變數設置正確，格式為：
```bash
mysql://user:password@host:3306/database_name
```

### WebSocket（Socket.IO）連線失敗

Railway 支援 WebSocket。如果失敗：
1. 確認後端啟用了 Socket.IO
2. 檢查前端是否使用正確的後端 URL
3. 查看 Railway 日誌：`railway logs`

## 自定義域名

### Vercel 自定義域名
1. Vercel 項目 → "Settings" → "Domains"
2. 添加自定義域名
3. 按提示配置 DNS 記錄
4. 3-48 小時生效

### Railway 自定義域名
1. Railway 項目 → 服務 → "Settings"
2. 找到 "Domain" 部分
3. 連結自定義域名
4. 配置 DNS 記錄（CNAME 或 A record）

## 升級到付費（可選）

- **Vercel Pro**：$20/月，額外功能
- **Railway Pro**：按使用量計費

無需升級即可運行生產級應用。

## 相關資源

- [Vercel 文檔](https://vercel.com/docs)
- [Railway 文檔](https://docs.railway.app)
- [Vite 環境變數](https://vitejs.dev/guide/env-and-mode.html)
- [tRPC 客戶端配置](https://trpc.io/docs/client/basic-usage)

## 常見命令速查

```bash
# Vercel
vercel login                    # 登入
vercel --prod                   # 部署到生產環境
vercel env pull                 # 拉取環境變數
vercel logs                      # 查看日誌
vercel remove                    # 移除項目

# Railway
railway login                    # 登入
railway init                     # 初始化新專案
railway up                       # 部署
railway logs                     # 查看日誌
railway shell                    # SSH 進入容器

# Git
git add .
git commit -m "message"
git push origin main             # 觸發自動部署
```

## 問題排查清單

- [ ] GitHub 倉庫已推送最新代碼
- [ ] Vercel 環境變數已設置 `VITE_BACKEND_URL`
- [ ] Railway 環境變數已設置 `DATABASE_URL` 等
- [ ] Dockerfile 可以本機運行：`docker build . && docker run -it -p 8080:8080 <image>`
- [ ] 前端已重新部署以應用環境變數
- [ ] 後端日誌正常（無錯誤堆疊）
- [ ] 瀏覽器能訪問後端 URL
