#!/bin/bash
# backup-db.sh — Резервное копирование базы 1С
#
# Переменные:
# SLUG        — слаг базы
# DB_NAME     — имя базы PostgreSQL
# DB_HOST     — хост PostgreSQL
# DB_USER     — пользователь PostgreSQL
# DB_PASS     — пароль PostgreSQL
# BACKUP_DIR  — директория для хранения бэкапов

set -e

SLUG="${SLUG:?SLUG is required}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:?DB_USER is required}"
DB_PASS="${DB_PASS:?DB_PASS is required}"
BACKUP_DIR="${BACKUP_DIR:-/opt/1c-backups}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/${SLUG}/${SLUG}_${DATE}.dump"

mkdir -p "${BACKUP_DIR}/${SLUG}"

log "=== Начало бэкапа: ${SLUG} ==="
log "[Шаг 1] pg_dump базы ${DB_NAME} -> ${BACKUP_FILE}"

PGPASSWORD="${DB_PASS}" pg_dump \
  -h "${DB_HOST}" \
  -U "${DB_USER}" \
  -Fc \
  -f "${BACKUP_FILE}" \
  "${DB_NAME}"

FILE_SIZE=$(stat -c%s "${BACKUP_FILE}")
log "[Шаг 2] Бэкап готов. Размер: ${FILE_SIZE} байт"

# Очистка старых бэкапов (>30 дней)
log "[Шаг 3] Очистка бэкапов старше 30 дней"
find "${BACKUP_DIR}/${SLUG}" -name '*.dump' -mtime +30 -delete

# Отдаём данные в stdout — читает Node.js job
echo "BACKUP_FILE=${BACKUP_FILE}"
echo "FILE_SIZE=${FILE_SIZE}"

log "=== Бэкап ${SLUG} завершен ==="
