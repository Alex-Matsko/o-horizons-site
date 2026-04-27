#!/bin/bash
# create-db.sh — Создание базы 1С через ibcmd
# Используется из BullMQ job через SSH
#
# Переменные окружения:
# SLUG         — уникальный слаг базы (portal_abc123)
# CONFIG       — название конфигурации (BP, UT, Roznica, UNF)
# DB_NAME      — имя базы PostgreSQL
# DB_HOST      — хост PostgreSQL
# DB_USER      — пользователь PostgreSQL
# DB_PASS      — пароль PostgreSQL
# ONEC_VERSION — версия 1С (8.3.27 или 8.5.1)
# RAC_HOST     — хост рагента
# CLUSTER_ID   — GUID кластера 1С
# CF_PATH      — путь к CF-файлу конфигурации
# APACHE_CONF_DIR — директория конфигов Apache
# ONEC_WEB_DIR    — путь до веб-клиента 1С (webinst)

set -e

SLUG="${SLUG:?SLUG is required}"
CONFIG="${CONFIG:?CONFIG is required}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:?DB_USER is required}"
DB_PASS="${DB_PASS:?DB_PASS is required}"
ONEC_VERSION="${ONEC_VERSION:-8.3.27}"
RAC_HOST="${RAC_HOST:-localhost:1545}"
CLUSTER_ID="${CLUSTER_ID:?CLUSTER_ID is required}"
CF_BASE_PATH="${CF_BASE_PATH:-/opt/1c/templates}"
APACHE_CONF_DIR="${APACHE_CONF_DIR:-/etc/apache2/sites-available}"
ONEC_WEB_DIR="${ONEC_WEB_DIR:-/var/www/1c}"
IBCMD="/opt/1cv8/${ONEC_VERSION}/bin/ibcmd"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

log "=== Начало создания базы: ${SLUG} (${CONFIG}) ==="

# Шаг 1: Создание базы PostgreSQL
log "[Шаг 1] Создание PostgreSQL базы: ${DB_NAME}"
PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -U "${DB_USER}" -c "CREATE DATABASE \"${DB_NAME}\";"

# Шаг 2: Создание базы 1С через ibcmd
log "[Шаг 2] Создание инфобазы 1С: ${SLUG}"
"${IBCMD}" infobase create \
  --dbms=postgresql \
  --db-server="${DB_HOST}" \
  --db-name="${DB_NAME}" \
  --db-user="${DB_USER}" \
  --db-pwd="${DB_PASS}" \
  com \
  --rac="${RAC_HOST}" \
  --cluster="${CLUSTER_ID}" \
  --name="${SLUG}" \
  --descr="Portal DB: ${SLUG}"

# Шаг 3: Загрузка CF-шаблона конфигурации
CF_FILE="${CF_BASE_PATH}/${CONFIG}.cf"
log "[Шаг 3] Загрузка конфигурации из: ${CF_FILE}"
if [ ! -f "${CF_FILE}" ]; then
  log "ОШИБКА: CF-файл не найден: ${CF_FILE}"
  exit 2
fi

"${IBCMD}" infobase config load \
  --dbms=postgresql \
  --db-server="${DB_HOST}" \
  --db-name="${DB_NAME}" \
  --db-user="${DB_USER}" \
  --db-pwd="${DB_PASS}" \
  --cf="${CF_FILE}" \
  --update-db-cfg \
  --apply

# Шаг 4: Создание Apache vhost для публикации базы
log "[Шаг 4] Публикация базы через Apache"
WEB_ALIAS="/${SLUG}"
WEB_DIR="${ONEC_WEB_DIR}/${SLUG}"
mkdir -p "${WEB_DIR}"

# webinst для публикации веб-клиента
webinst -apache2 -wsdir "${WEB_ALIAS}" \
  -dir "${WEB_DIR}" \
  -descriptor "/opt/1cv8/${ONEC_VERSION}/bin" \
  -connstr "Srvr=localhost;Ref=${SLUG};"

# Reload Apache
apache2ctl graceful
log "[Шаг 4] Apache перезагружен"

# Шаг 5: Вывод веб-URL для портала
WEB_URL="https://1c.o-horizons.com${WEB_ALIAS}"
log "[Шаг 5] База готова: ${WEB_URL}"

# Отдаём URL в stdout — его читает Node.js job
echo "WEB_URL=${WEB_URL}"

log "=== База ${SLUG} успешно создана ==="
