#!/usr/bin/env bash
# ==============================================================================
# CycloPon Database & GPX Restore Utility
# Restores data from a specified backup archive (.tar.gz)
# ==============================================================================

set -euo pipefail

DATA_DIR="${DATA_DIR:-./data}"
GPX_DIR="${GPX_DIR:-./public/gpx}"

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_archive.tar.gz>"
    echo "Example: $0 ./backups/cyclopon_backup_20261006_120000.tar.gz"
    exit 1
fi

ARCHIVE="$1"

if [ ! -f "${ARCHIVE}" ]; then
    echo "❌ [CycloPon] Backup archive not found: ${ARCHIVE}"
    exit 1
fi

echo "⚠️  [WARNING] Restoring will overwrite existing database and GPX files in:"
echo "   - ${DATA_DIR}"
echo "   - ${GPX_DIR}"
read -p "Are you sure you want to proceed? (y/N): " -r CONFIRM
if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

TEMP_RESTORE=$(mktemp -d)
trap 'rm -rf "${TEMP_RESTORE}"' EXIT

echo "📦 Extracting archive..."
tar -xzf "${ARCHIVE}" -C "${TEMP_RESTORE}"

echo "💾 Restoring SQLite database..."
mkdir -p "${DATA_DIR}"
if [ -f "${TEMP_RESTORE}/cyclopon.db" ]; then
    cp -f "${TEMP_RESTORE}/cyclopon.db"* "${DATA_DIR}/"
fi

echo "🗺️  Restoring GPX routes..."
mkdir -p "${GPX_DIR}"
if [ -d "${TEMP_RESTORE}/gpx" ]; then
    cp -rf "${TEMP_RESTORE}/gpx/"* "${GPX_DIR}/" 2>/dev/null || true
fi

echo "✅ [CycloPon] Restore completed successfully from ${ARCHIVE}."
echo "💡 Hint: Restart the container if CycloPon is currently running: docker compose restart cyclopon"
