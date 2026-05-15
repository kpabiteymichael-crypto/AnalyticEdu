#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EduAnalytics — PostgreSQL backup script
# Usage: ./scripts/backup.sh [--restore <file>]
# Schedule: add to cron — 0 2 * * * /path/to/scripts/backup.sh >> /var/log/eduanalytics-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL env var is required}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/eduanalytics_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# ─── Backup ───────────────────────────────────────────────
if [[ "${1:-}" != "--restore" ]]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup → $BACKUP_FILE"

  pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-acl \
    --format=plain \
    --compress=9 \
    | gzip -9 > "$BACKUP_FILE"

  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete. Size: $SIZE"

  # Remove backups older than RETENTION_DAYS
  find "$BACKUP_DIR" -name "eduanalytics_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Pruned backups older than $RETENTION_DAYS days"
  exit 0
fi

# ─── Restore ──────────────────────────────────────────────
RESTORE_FILE="${2:?Usage: $0 --restore <backup-file.sql.gz>}"
if [[ ! -f "$RESTORE_FILE" ]]; then
  echo "ERROR: File not found: $RESTORE_FILE" >&2; exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restoring from $RESTORE_FILE"
echo "WARNING: This will overwrite the database. Press Ctrl+C within 5 seconds to cancel."
sleep 5

gunzip -c "$RESTORE_FILE" | psql "$DATABASE_URL"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restore complete."
