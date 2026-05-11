# Railway + Vercel 完整部署自動化腳本 (Windows PowerShell)
# 執行此腳本以部署後端到 Railway 並配置 Vercel 前端

$ErrorActionPreference = "Stop"

Write-Host "🚀 開始 Railway + Vercel 部署流程..." -ForegroundColor Green

# 第 1 步：檢查 Railway CLI
Write-Host "`n⏳ 檢查 Railway CLI..." -ForegroundColor Yellow
try {
    railway --version | Out-Null
} catch {
    Write-Host "❌ Railway CLI 未安裝" -ForegroundColor Red
    Write-Host "📥 安裝 Railway CLI:"
    Write-Host "   npm install -g @railway/cli"
    exit 1
}

# 第 2 步：Railway 登入驗證
Write-Host "🔐 驗證 Railway 登入..." -ForegroundColor Yellow
try {
    railway whoami | Out-Null
} catch {
    Write-Host "❌ 未登入 Railway" -ForegroundColor Red
    Write-Host "🔑 請先登入："
    railway login
}

# 第 3 步：創建 Railway 項目（如果不存在）
Write-Host "📦 創建/連接 Railway 項目..." -ForegroundColor Yellow
railway init --name porn-guesser

# 第 4 步：部署
Write-Host "🚀 部署到 Railway..." -ForegroundColor Yellow
railway up

# 第 5 步：獲取後端 URL
Write-Host "🔗 獲取後端 URL..." -ForegroundColor Yellow
$serviceInfo = railway service info
$BACKEND_URL = ($serviceInfo | Select-String -Pattern 'https://[^\s]+' | Select-Object -First 1 -ExpandProperty Line).Trim()

if ([string]::IsNullOrEmpty($BACKEND_URL)) {
    Write-Host "⚠️  無法自動獲取 URL" -ForegroundColor Yellow
    Write-Host "📍 請手動訪問 https://railway.app 複製後端 URL"
    Write-Host "   (格式：https://your-service-xxxx.railway.app)"
    $BACKEND_URL = Read-Host "輸入後端 URL"
}

Write-Host "✅ 後端 URL: $BACKEND_URL" -ForegroundColor Green

# 第 6 步：配置 Vercel 環境變數
Write-Host "`n⚙️  配置 Vercel 環境變數..." -ForegroundColor Yellow
Write-Host "   進行以下操作："
Write-Host "   1. 訪問 https://vercel.com/curtis-chens-projects/porn-guesser/settings/environment-variables"
Write-Host "   2. 添加新變數："
Write-Host "      - 名稱: VITE_BACKEND_URL"
Write-Host "      - 值: $BACKEND_URL"
Write-Host "      - 環境: Production"
Write-Host "   3. 點擊保存"
Write-Host ""

$reply = Read-Host "✅ 已配置環境變數？(y/n)"
if ($reply -eq "y" -or $reply -eq "Y") {
    Write-Host ""
    Write-Host "🔄 重新部署 Vercel 前端..." -ForegroundColor Yellow
    cd 'F:\Grownassman\porn_guesser_github'
    git commit --allow-empty -m "Configure backend: $BACKEND_URL"
    git push origin main
    Write-Host "✅ Vercel 重新部署已觸發" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  請手動配置環境變數後重新部署" -ForegroundColor Yellow
}

# 第 7 步：驗證
Write-Host "`n🔍 驗證連接..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/trpc/content.getCategories?batch=1&input=%7B%220%22:%7B%22json%22:%7B%7D%7D%7D" -UseBasicParsing
    Write-Host $response.Content.Substring(0, [Math]::Min(100, $response.Content.Length))
    Write-Host ""
    Write-Host "✅ 部署完成！" -ForegroundColor Green
    Write-Host "   前端: https://porn-guesser.vercel.app"
    Write-Host "   後端: $BACKEND_URL"
} catch {
    Write-Host "⚠️  連接驗證失敗，請檢查 URL" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "📊 下一步：" -ForegroundColor Cyan
Write-Host "   1. 訪問 https://porn-guesser.vercel.app/game/video"
Write-Host "   2. 瀏覽器開發者工具 (F12) → Network"
Write-Host "   3. 檢查 trpc 請求是否連接到後端"
Write-Host "   4. 如有 CORS 錯誤，檢查後端環境變數"
