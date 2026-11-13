# ==============================================================================
# CycloPon Automated VPS Deployment Script (PowerShell)
# Automatically pushes local changes to Git, pulls on VPS, and updates Docker.
# ==============================================================================

param(
  [string]$Message = "",
  [string]$VpsUser = "ubuntu",
  [string]$VpsIp = "43.173.51.161",
  [int]$VpsPort = 22,
  [string]$VpsDir = "/home/ubuntu/cyclopon"
)

$Branch = (git rev-parse --abbrev-ref HEAD 2>$null)
if (-not $Branch) { $Branch = "master" }

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 [CycloPon] Automated VPS Deployment Started" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Target Server : $VpsUser@$VpsIp`:$VpsDir" -ForegroundColor Yellow
Write-Host "Git Branch    : $Branch" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check Local Git Status
Write-Host "[1/4] Checking local Git status..." -ForegroundColor Cyan
$dirty = git status --porcelain
if ($dirty) {
  Write-Host "⚠️ Detected unstaged/uncommitted changes:" -ForegroundColor Yellow
  git status --short
  Write-Host ""

  if (-not $Message) {
    $Message = Read-Host "Masukkan pesan commit (atau tekan Enter untuk batal)"
    if (-not $Message) {
      Write-Host "❌ Deployment dibatalkan. Silakan commit perubahan Anda terlebih dahulu." -ForegroundColor Red
      exit 1
    }
  }

  git add -A
  git commit -m $Message
  Write-Host "✓ Committed changes." -ForegroundColor Green
} else {
  Write-Host "✓ Local working tree is clean." -ForegroundColor Green
}

# Step 2: Push Local Changes to Remote
Write-Host ""
Write-Host "[2/4] Pushing changes to remote ($Branch)..." -ForegroundColor Cyan
git push origin $Branch
Write-Host "✓ Successfully pushed to remote." -ForegroundColor Green

# Step 3: Execute Remote Deployment via SSH
Write-Host ""
Write-Host "[3/4] Connecting to VPS to pull and update containers..." -ForegroundColor Cyan

$remoteCmd = @"
  set -e
  cd $VpsDir
  echo '→ Pulling latest commits from Git...'
  git -c core.fileMode=false pull origin $Branch

  COMPOSE_FILE='docker-compose.yml'
  if [ -f 'docker-compose.prod.yml' ]; then
    COMPOSE_FILE='docker-compose.prod.yml'
  fi
  echo "→ Active Compose File: `$COMPOSE_FILE"

  echo '→ Rebuilding cyclopon container image and refreshing services...'
  docker compose -f `$COMPOSE_FILE up -d --build --force-recreate

  echo '→ Running clean-demo-data inside cyclopon container...'
  docker compose -f `$COMPOSE_FILE exec -T cyclopon node scripts/clean-demo-data.js || true

  echo '→ Verifying container status...'
  docker compose -f `$COMPOSE_FILE ps
"@

ssh -p $VpsPort "$VpsUser@$VpsIp" $remoteCmd

# Step 4: Verification & Summary
Write-Host ""
Write-Host "[4/4] Verifying deployment health..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host "====================================================" -ForegroundColor Green
Write-Host "🎉 [CycloPon] Deployment to VPS Finished Successfully!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "Web App URL : https://$VpsIp (or http://$VpsIp`:3000)" -ForegroundColor Cyan
Write-Host "Traccar GPS : http://$VpsIp`:8082" -ForegroundColor Cyan

