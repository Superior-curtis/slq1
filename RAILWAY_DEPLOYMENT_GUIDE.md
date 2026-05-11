# 🚀 Railway 後端 + Vercel 前端 完整部署指南

## ⚡ 快速開始（5 分鐘）

### 前置準備
- ✅ GitHub 倉庫已連接：`Superior-curtis/porn_guesser`
- ✅ Vercel 前端已部署：`https://porn-guesser.vercel.app`
- ✅ Railway 帳戶已創建：`https://railway.app`

---

## 📋 步驟 1：安裝 Railway CLI（2 分鐘）

**Windows PowerShell**：
```powershell
npm install -g @railway/cli
```

**驗證安裝**：
```powershell
railway --version
```

---

## 🔑 步驟 2：Railway 登入（1 分鐘）

```powershell
railway login
```

這會打開瀏覽器要求你登入 Railway。完成後回到終端。

---

## 🏗️ 步驟 3：初始化 Railway 項目（1 分鐘）

在專案目錄：
```powershell
cd 'F:\Grownassman\porn_guesser_github'
railway init --name porn-guesser
```

Railway 會要求：
- **Create new project?** → 選擇 `Yes`
- **Select a template?** → 選擇 `Docker` 或 `Blank`

---

## 🚀 步驟 4：部署應用（1-2 分鐘）

```powershell
railway up
```

這會自動：
1. 檢測 `Dockerfile`
2. 構建容器鏡像
3. 部署到 Railway
4. 分配公網 URL

**等待部署完成**...輸出應類似：
```
✅ Deployment complete!
🔗 https://porn-guesser-xxxx.railway.app
```

---

## 🔗 步驟 5：複製後端 URL

從上面的輸出複製完整 URL，例如：
```
https://porn-guesser-5a8b9c2d-1234.railway.app
```

**保存此 URL** - 下一步需要！

---

## ⚙️ 步驟 6：配置 Vercel 環境變數（2 分鐘）

### 方法 A：使用 Vercel CLI（推薦）

```powershell
vercel env add VITE_BACKEND_URL
```

提示輸入時：
- **Value**: 粘貼你的後端 URL（如 `https://porn-guesser-5a8b9c2d-1234.railway.app`）
- **Environment**: 選擇 `production`

### 方法 B：手動在 Vercel 網站

1. 訪問：https://vercel.com/curtis-chens-projects/porn-guesser/settings/environment-variables
2. 點擊「Add New」
3. 填入：
   - **Name**: `VITE_BACKEND_URL`
   - **Value**: 你的後端 URL
   - **Environments**: Production
4. 點擊「Save」

---

## 🔄 步驟 7：重新部署 Vercel 前端

使前端獲得新的環境變數：

```powershell
cd 'F:\Grownassman\porn_guesser_github'
git commit --allow-empty -m "Configure backend URL"
git push origin main
```

Vercel 會自動重新部署。等待 2-3 分鐘...

---

## ✅ 步驟 8：驗證部署

### 測試 1：後端直接訪問
```powershell
Invoke-WebRequest -UseBasicParsing 'https://porn-guesser-xxxx.railway.app/api/trpc/content.getCategories?batch=1&input=%7B%220%22:%7B%22json%22:%7B%7D%7D%7D'
```

應返回分類列表（JSON）。

### 測試 2：生產站點
1. 打開 https://porn-guesser.vercel.app/game/video
2. 按 `F12` 打開開發者工具
3. 進入 **Network** 標籤
4. 點擊「Find Match」按鈕
5. 檢查 `trpc` 請求：
   - ✅ 應連接到你的後端 URL
   - ✅ 無 CORS 錯誤
   - ✅ 返回真實分類和影片內容

---

## 🔍 故障排除

### 問題 1：Railway 部署失敗
**症狀**：`Error: Build failed`

**解決**：
```powershell
railway logs  # 查看詳細錯誤
```

通常原因：
- ❌ `Dockerfile` 不存在 → 檢查 `F:\Grownassman\porn_guesser_github\Dockerfile`
- ❌ Node 版本不兼容 → 檢查 `.vercel\project.json` 中的 `nodeVersion`

### 問題 2：CORS 錯誤
**症狀**：生產站點無法連接後端

**解決**：
1. 檢查 `VITE_BACKEND_URL` 是否正確設置
   ```powershell
   vercel env list
   ```
2. 重新部署 Vercel（見步驟 7）
3. 清除瀏覽器快取（Ctrl+Shift+Delete）

### 問題 3：後端 URL 變更
**症狀**：Railway 部署後 URL 不同

**解決**：
```powershell
railway service info  # 獲取新 URL
# 更新 Vercel 環境變數
vercel env add VITE_BACKEND_URL
git push origin main
```

---

## 📊 最終驗證清單

- [ ] Railway 部署成功，後端 URL 可訪問
- [ ] Vercel 環境變數已設置
- [ ] Vercel 前端已重新部署
- [ ] 生產站點能訪問（無白屏）
- [ ] 分類下拉菜單有內容
- [ ] 「Find Match」能連接到後端
- [ ] 開發者工具無 CORS 錯誤
- [ ] 能獲得真實影片內容（有 viewkey）

---

## 🎉 部署完成！

你的應用現已：
- **前端**：https://porn-guesser.vercel.app（Vercel 靜態托管）
- **後端**：https://porn-guesser-xxxx.railway.app（Railway 容器）
- **全球可訪問**：任何地區的用戶都能玩遊戲

---

## 📞 需要幫助？

如有問題，檢查：
1. 終端輸出中的錯誤信息
2. `railway logs` 和 `railway logs --tail`
3. Vercel 部署日誌：https://vercel.com/curtis-chens-projects/porn-guesser/deployments
4. Railway 部署日誌：https://railway.app（選擇項目 → Deployments）

---

**下一命令**：
```powershell
cd 'F:\Grownassman\porn_guesser_github'
.\deploy-railway.ps1
```
