# 快速部署清單 - Vercel + Railway（5 分鐘）

## 清單

- [ ] **第 0 步**：推送代碼到 GitHub
  ```bash
  git add .
  git commit -m "Add deployment config"
  git push origin main
  ```

- [ ] **第 1 步**：部署前端到 Vercel（3 分鐘）
  - [ ] 登入 [vercel.com](https://vercel.com)
  - [ ] 點擊 "Add New" → "Project"
  - [ ] 連結 GitHub 倉庫 `porn_guesser`
  - [ ] 點擊 "Deploy"
  - [ ] 稍待部署完成，複製前端 URL

  **前端 URL 示例**：`https://porn-guesser.vercel.app`

- [ ] **第 2 步**：部署後端到 Railway（2 分鐘）
  - [ ] 登入 [railway.app](https://railway.app)
  - [ ] 點擊 "New Project" → "Deploy from GitHub"
  - [ ] 選擇倉庫
  - [ ] Railway 自動檢測 Dockerfile 並部署
  - [ ] 稍待完成，複製後端 URL

  **後端 URL 示例**：`https://porn-guesser-xxxx.railway.app`

- [ ] **第 3 步**：配置前端環境變數（1 分鐘）
  - [ ] Vercel 項目 → "Settings"
  - [ ] 點擊 "Environment Variables"
  - [ ] 新增變數：
    - 名稱：`VITE_BACKEND_URL`
    - 值：`https://porn-guesser-xxxx.railway.app`（複製第 2 步的 URL）
  - [ ] 環境選擇 "Production"
  - [ ] 點擊 "Save"

- [ ] **第 4 步**：重新部署前端（自動）
  ```bash
  git commit --allow-empty -m "Redeploy"
  git push origin main
  ```

  或在 Vercel 頁面手動點擊 "Redeploy"

- [ ] **第 5 步**：驗證部署
  - [ ] 訪問前端 URL：`https://porn-guesser.vercel.app`
  - [ ] 打開瀏覽器開發者工具（F12）
  - [ ] 檢查網路請求是否連結到後端 URL
  - [ ] 沒有 CORS 錯誤 ✅

## 後端環境變數設定（可選但重要）

Railway 服務需要數據庫與認證變數。在 Railway 項目中設置：

1. Railway 項目首頁 → 選擇服務 → "porn-guesser"
2. "Variables" 標籤
3. 添加以下變數（根據需要）：

```bash
DATABASE_URL=mysql://user:password@host:3306/database
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
NODE_ENV=production
PORT=8080
```

## 成本確認

- **Vercel 前端**：免費（無限帶寬）
- **Railway 後端**：免費層 $5/月 積分（足夠運行 100-200 小時）
- **總成本**：免費或 ~$5/月

## 應急方案

如果 Vercel 或 Railway 出現問題：

- **Vercel 替代**：Netlify（同樣免費，自動 CI/CD）
- **Railway 替代**：Render 或 Fly（都有免費層）

## 驗證清單

- [ ] 前端能訪問
- [ ] 後端能訪問（`curl https://your-backend.railway.app`）
- [ ] 前端能調用後端 API（瀏覽器網路標籤無 CORS 錯誤）
- [ ] Socket.IO 連線正常（如適用）
- [ ] 數據庫連線正常（如適用）

## 常見問題

### Q: 前端顯示白屏？
**A**: 清除瀏覽器快取（Ctrl+Shift+Delete），重新訪問。

### Q: CORS 錯誤？
**A**: 確認環境變數已設置，重新部署前端。

### Q: Railway 服務啟動失敗？
**A**: 查看日誌：`railway logs`，通常是缺少環境變數。

### Q: 不想要 Railway？
**A**: 改用 Render 或 Fly，流程幾乎相同。

## 下一步（可選）

- [ ] 配置自定義域名
- [ ] 設定 GitHub Actions CI/CD
- [ ] 配置數據庫備份
- [ ] 設定監控與提醒

---

有問題？查看詳細文檔：[DEPLOY_VERCEL_RAILWAY.md](./DEPLOY_VERCEL_RAILWAY.md)
