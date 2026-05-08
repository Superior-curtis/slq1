# 部署配置文件說明

本項目已配置 **Vercel 前端 + Railway 後端** 的完整部署方案。

## 📁 新增文件

- **`vercel.json`** - Vercel 前端部署配置（SPA 路由設定）
- **`Dockerfile`** - Railway 後端容器配置（Node.js + Python）
- **`railway.json`** - Railway 部署參數（可選）
- **`.dockerignore`** - Docker 構建排除清單
- **`.env`** - 開發環境變數模板
- **`DEPLOY_VERCEL_RAILWAY.md`** - 完整部署文檔
- **`DEPLOY_CHECKLIST.md`** - 快速部署清單（推薦先讀）

## 🚀 快速開始

### 1. 修改的文件
- **`client/src/main.tsx`** - 已更新以支援環境變數的後端 URL

### 2. 部署步驟
1. 推送代碼到 GitHub：`git push origin main`
2. 部署前端到 Vercel（自動）或手動
3. 部署後端到 Railway
4. 設定前端環境變數指向後端 URL
5. 重新部署前端

詳見：[DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)

## 📖 詳細文檔

- **快速開始**：[DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)（5 分鐘）
- **完整指南**：[DEPLOY_VERCEL_RAILWAY.md](./DEPLOY_VERCEL_RAILWAY.md)（含故障排除）

## 🔧 本機開發

```bash
# 開發環境默認使用 localhost 後端
npm run dev  # 啟動後端
cd client && npm run dev  # 啟動前端（另一個終端）
```

## 💰 成本

- **Vercel**：免費（前端）
- **Railway**：免費層或 ~$5/月
- **總計**：100% 免費或最多 $5/月

## 📞 支持

- [Vercel 文檔](https://vercel.com/docs)
- [Railway 文檔](https://docs.railway.app)
- [Vite 環境變數](https://vitejs.dev/guide/env-and-mode.html)
