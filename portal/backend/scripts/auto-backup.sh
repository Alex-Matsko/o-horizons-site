#!/bin/bash
# auto-backup.sh — called by cron daily at 03:00 UTC
# Backs up all active 1C databases via pg_dump
set -e

BACKUP_DIR="${BACKUP_LOCAL_PATH:-/backups}"
PG_HOST="${ONEC_PG_HOST:-localhost}"
PG_USER="${ONEC_PG_USER:-onec_user}"
DATE=$(date +%Y-%m-%d)

mkdir -p "$BACKUP_DIR"

# Get list of active databases from portal DB
ACTIVE_DBS=$(psql -U portal_user -d portal -h portal-db -t -c \
  "SELECT pg_database_name FROM databases WHERE status='ACTIVE' AND deleted_at IS NULL AND pg_database_name IS NOT NULL;")

for DB in $ACTIVE_DBS; do
  DB=$(echo $DB | tr -d ' ')
  [ -z "$DB" ] && continue
  OUT_DIR="$BACKUP_DIR/$DB"
  mkdir -p "$OUT_DIR"
  OUT_FILE="$OUT_DIR/${DB}_${DATE}.dump"
  echo "Backing up $DB -> $OUT_FILE"
  PGPASSWORD="$ONEC_PG_PASSWORD" pg_dump -Fc -h "$PG_HOST" -U "$PG_USER" "$DB" > "$OUT_FILE"
  echo "Done: $OUT_FILE ($(du -h $OUT_FILE | cut -f1))"
done

echo "Auto-backup completed: $(date)"
