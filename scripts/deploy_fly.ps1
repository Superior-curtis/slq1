param(
    [string]$FlyApiToken = $env:FLY_API_TOKEN
)

Write-Host "Fly.io deploy helper"

if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
    Write-Host "flyctl not found in PATH. Install from https://fly.io/docs/hands-on/installing/" -ForegroundColor Yellow
    exit 1
}

if (-not $FlyApiToken) {
    Write-Host "No FLY_API_TOKEN provided; checking existing Fly session..."
} else {
    $env:FLY_API_TOKEN = $FlyApiToken
}

flyctl auth whoami | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No active Fly session found; starting interactive login..."
    flyctl auth login
}

Write-Host "Ensuring Fly app exists..."
flyctl apps list | Select-String "porn-guesser" | Out-Null
if ($LASTEXITCODE -ne 0) {
    flyctl launch --name porn-guesser --region sjc --copy-config --no-deploy
} else {
    Write-Host "App 'porn-guesser' already exists. Continuing to deploy..."
}

Write-Host "Building and deploying to Fly.io..."
flyctl deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployed to Fly.io successfully. Remember to set Vercel VITE_BACKEND_URL to the app URL." -ForegroundColor Green
} else {
    Write-Host "Deploy failed. Check flyctl output above." -ForegroundColor Red
}
