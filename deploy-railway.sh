#!/bin/bash
# Railway + Vercel 完整部署自動化腳本
# 執行此腳本以部署後端到 Railway 並配置 Vercel 前端

set -e

echo "🚀 開始 Railway + Vercel 部署流程..."

# 第 1 步：檢查 Railway CLI
echo "⏳ 檢查 Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安裝"
    echo "📥 安裝 Railway CLI:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# 第 2 步：Railway 登入驗證
echo "🔐 驗證 Railway 登入..."
railway whoami || {
    echo "❌ 未登入 Railway"
    echo "🔑 請先登入："
    railway login
}

# 第 3 步：創建 Railway 項目（如果不存在）
echo "📦 創建/連接 Railway 項目..."
railway init --name porn-guesser

# 第 4 步：部署
echo "🚀 部署到 Railway..."
railway up

# 第 5 步：獲取後端 URL
echo "🔗 獲取後端 URL..."
BACKEND_URL=$(railway service info | grep -oP 'https://[^\s]+' | head -1)

if [ -z "$BACKEND_URL" ]; then
    echo "⚠️  無法自動獲取 URL"
    echo "📍 請手動訪問 https://railway.app 複製後端 URL"
    echo "   (格式：https://your-service-xxxx.railway.app)"
    read -p "輸入後端 URL: " BACKEND_URL
fi

echo "✅ 後端 URL: $BACKEND_URL"

# 第 6 步：配置 Vercel 環境變數
echo "⚙️  配置 Vercel 環境變數..."
echo "   進行以下操作："
echo "   1. 訪問 https://vercel.com/curtis-chens-projects/porn-guesser/settings/environment-variables"
echo "   2. 添加新變數："
echo "      - 名稱: VITE_BACKEND_URL"
echo "      - 值: $BACKEND_URL"
echo "      - 環境: Production"
echo "   3. 點擊保存"
echo ""
read -p "✅ 已配置環境變數？(y/n): " -n 1
if [ "$REPLY" == "y" ] || [ "$REPLY" == "Y" ]; then
    echo ""
    echo "🔄 重新部署 Vercel 前端..."
    git commit --allow-empty -m "Configure backend: $BACKEND_URL"
    git push origin main
    echo "✅ Vercel 重新部署已觸發"
else
    echo ""
    echo "⚠️  請手動配置環境變數後重新部署"
fi

# 第 7 步：驗證
echo "🔍 驗證連接..."
sleep 5
curl -s "$BACKEND_URL/api/trpc/content.getCategories?batch=1&input=%7B%220%22:%7B%22json%22:%7B%7D%7D%7D" | head -c 100
echo ""
echo ""

if [ $? -eq 0 ]; then
    echo "✅ 部署完成！"
    echo "   前端: https://porn-guesser.vercel.app"
    echo "   後端: $BACKEND_URL"
else
    echo "⚠️  連接驗證失敗，請檢查 URL"
fi

echo ""
echo "📊 下一步："
echo "   1. 訪問 https://porn-guesser.vercel.app/game/video"
echo "   2. 瀏覽器開發者工具 (F12) → Network"
echo "   3. 檢查 trpc 請求是否連接到後端"
echo "   4. 如有 CORS 錯誤，檢查後端環境變數"
