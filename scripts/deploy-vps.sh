#!/usr/bin/env bash
# ==============================================================================
# CycloPon Automated VPS Deployment Script
# Automatically pushes local changes to Git, pulls on VPS, and updates Docker.
# ==============================================================================

set -euo pipefail

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default Configuration
VPS_USER="${VPS_USER:-ubuntu}"
VPS_IP="${VPS_IP:-43.173.51.161}"
VPS_PORT="${VPS_PORT:-22}"
VPS_DIR="${VPS_DIR:-/home/ubuntu/cyclopon}"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "master")

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}🚀 [CycloPon] Automated VPS Deployment Started${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "Target Server : ${YELLOW}${VPS_USER}@${VPS_IP}:${VPS_DIR}${NC}"
echo -e "Git Branch    : ${YELLOW}${BRANCH}${NC}"
echo ""

# Parse flags
REBUILD_DOCKER=false
SYNC_DATABASE=false
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebuild|-r)
      REBUILD_DOCKER=true
      shift
      ;;
    --sync-db|-d)
      SYNC_DATABASE=true
      shift
      ;;
    -m|--message)
      COMMIT_MSG="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Step 1: Check Local Git Status
echo -e "${CYAN}[1/4] Checking local Git status...${NC}"
DIRTY_FILES=$(git -c core.fileMode=false status --porcelain || true)

if [ -n "${DIRTY_FILES}" ]; then
  echo -e "${YELLOW}⚠️ Detected unstaged/uncommitted changes:${NC}"
  git -c core.fileMode=false status --short
  echo ""

  if [ -n "${COMMIT_MSG}" ]; then
    echo -e "  → Auto-committing changes with message: \"${COMMIT_MSG}\""
    git -c core.fileMode=false add -A
    git commit -m "${COMMIT_MSG}"
  else
    read -rp "Masukkan pesan commit (atau tekan Enter untuk batal): " USER_MSG
    if [ -z "${USER_MSG}" ]; then
      echo -e "${RED}❌ Deployment dibatalkan. Silakan commit perubahan Anda terlebih dahulu.${NC}"
      exit 1
    fi
    git -c core.fileMode=false add -A
    git commit -m "${USER_MSG}"
  fi
else
  echo -e "${GREEN}✓ Local working tree is clean.${NC}"
fi

# Step 2: Push Local Changes to GitHub
echo ""
echo -e "${CYAN}[2/4] Pushing changes to remote (${BRANCH})...${NC}"
git push origin "${BRANCH}"
echo -e "${GREEN}✓ Successfully pushed to remote.${NC}"

# Step 3: (Optional) Sync Local SQLite Database to VPS
if [ "${SYNC_DATABASE}" = true ]; then
  echo ""
  echo -e "${CYAN}[+] Syncing local database to VPS...${NC}"
  if [ -f "data/cyclopon.db" ]; then
    scp -P "${VPS_PORT}" data/cyclopon.db "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/cyclopon.db"
    ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_IP}" "
      cd ${VPS_DIR}
      if docker compose ps --services | grep -q cyclopon; then
        docker compose cp /home/${VPS_USER}/cyclopon.db cyclopon:/app/data/cyclopon.db
      fi
    "
    echo -e "${GREEN}✓ Local database synced to VPS volume.${NC}"
  else
    echo -e "${YELLOW}⚠️ File data/cyclopon.db tidak ditemukan, melewati sinkronisasi database.${NC}"
  fi
fi

# Step 4: Execute Remote Deployment via SSH
echo ""
echo -e "${CYAN}[3/4] Connecting to VPS to pull and update containers...${NC}"

SSH_CMD="
  set -e
  cd ${VPS_DIR}
  echo '→ Pulling latest commits from Git...'
  git -c core.fileMode=false pull origin ${BRANCH}

  # Detect active compose file (production Caddy or standalone)
  COMPOSE_FILE='docker-compose.yml'
  if [ -f 'docker-compose.prod.yml' ] && docker compose -f docker-compose.prod.yml ps -q >/dev/null 2>&1 && [ -n \"\$(docker compose -f docker-compose.prod.yml ps -q 2>/dev/null)\" ]; then
    COMPOSE_FILE='docker-compose.prod.yml'
  fi

  echo \"→ Active Compose File: \$COMPOSE_FILE\"

  if [ \"${REBUILD_DOCKER}\" = true ]; then
    echo '→ Rebuilding cyclopon container image...'
    docker compose -f \$COMPOSE_FILE up -d --build cyclopon
  else
    echo '→ Restarting cyclopon container to apply code updates...'
    docker compose -f \$COMPOSE_FILE restart cyclopon
  fi

  echo '→ Running clean-demo-data inside cyclopon container...'
  docker compose -f \$COMPOSE_FILE exec -T cyclopon node scripts/clean-demo-data.js || true

  echo '→ Verifying container status...'
  docker compose -f \$COMPOSE_FILE ps
"

ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_IP}" "${SSH_CMD}"

# Step 5: Verification & Summary
echo ""
echo -e "${CYAN}[4/4] Verifying deployment health...${NC}"
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://${VPS_IP}:3000" || echo "FAILED")

if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "301" ] || [ "${HTTP_CODE}" = "302" ]; then
  echo -e "${GREEN}✓ VPS Web Server responded with HTTP ${HTTP_CODE}${NC}"
  echo ""
  echo -e "${GREEN}====================================================${NC}"
  echo -e "${GREEN}🎉 [CycloPon] Deployment to VPS Finished Successfully!${NC}"
  echo -e "${GREEN}====================================================${NC}"
  echo -e "Web App URL : ${CYAN}http://${VPS_IP}:3000${NC}"
  echo -e "Traccar GPS : ${CYAN}http://${VPS_IP}:8082${NC}"
else
  echo -e "${YELLOW}⚠️ Server returned status: ${HTTP_CODE} (mungkin sedang booting atau menggunakan HTTPS / Caddy).${NC}"
  echo -e "${GREEN}✓ Proses deploy selesai. Cek log server jika diperlukan via: ssh ${VPS_USER}@${VPS_IP} 'docker compose logs -f'${NC}"
fi

