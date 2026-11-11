#!/usr/bin/env bash
# ==============================================================================
# CycloPon Database & GPX Backup Utility
# Creates timestamped .tar.gz archives of cyclopon.db and public/gpx/
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATA_DIR="${DATA_DIR:-./data}"
GPX_DIR="${GPX_DIR:-./public/gpx}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_NAME="cyclopon_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "📦 [CycloPon] Starting backup process at $(date)..."

# Temporary directory for clean snapshot
TEMP_STAGE=$(mktemp -d)
trap 'rm -rf "${TEMP_STAGE}"' EXIT

# Safely copy database (supports active WAL mode via sqlite3 if available)
if command -v sqlite3 >/dev/null 2>&1 && [ -f "${DATA_DIR}/cyclopon.db" ]; then
    echo "  → Performing consistent SQLite .backup..."
    sqlite3 "${DATA_DIR}/cyclopon.db" ".backup '${TEMP_STAGE}/cyclopon.db'"
else
    echo "  → Copying database files directly..."
    mkdir -p "${TEMP_STAGE}"
    cp -r "${DATA_DIR}"/* "${TEMP_STAGE}/" 2>/dev/null || true
fi

# Copy GPX files
mkdir -p "${TEMP_STAGE}/gpx"
if [ -d "${GPX_DIR}" ]; then
    cp -r "${GPX_DIR}"/* "${TEMP_STAGE}/gpx/" 2>/dev/null || true
fi

# Create tar.gz archive
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "${TEMP_STAGE}" .

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)
echo "✅ [CycloPon] Backup created successfully: ${BACKUP_DIR}/${ARCHIVE_NAME} (${BACKUP_SIZE})"

# Prune old backups (keep last 14 backups)
echo "🧹 [CycloPon] Pruning backups older than 14 runs..."
ls -t "${BACKUP_DIR}"/cyclopon_backup_*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "🎉 [CycloPon] Backup completed."
