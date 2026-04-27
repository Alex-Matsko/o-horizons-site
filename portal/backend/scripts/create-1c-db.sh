#!/bin/bash
# create-1c-db.sh <db_name> <pg_db_name> <template_cf_path>
# Runs on the 1C server via SSH
set -e

DB_NAME="$1"
PG_DB="$2"
CF_TEMPLATE="$3"

ONEC_BIN="/opt/1cv8/current"
APACHE_CONF_DIR="/etc/apache2/conf-available"
WEB_ROOT="/var/www/html/1c"

echo "[1] Creating PostgreSQL database: $PG_DB"
psql -U postgres -c "CREATE DATABASE \"$PG_DB\" OWNER onec_user ENCODING 'UTF8' LC_COLLATE 'ru_RU.UTF-8' LC_CTYPE 'ru_RU.UTF-8' TEMPLATE template0;"

echo "[2] Creating 1C infobase: $DB_NAME"
"$ONEC_BIN/ibcmd" infobase create \
  --name="$DB_NAME" \
  --dbms=PostgreSQL \
  --db-server=localhost \
  --db-name="$PG_DB" \
  --db-user=onec_user \
  --db-pwd="$ONEC_PG_PASSWORD" \
  --license-distribution=allow \
  --create-db

if [ -n "$CF_TEMPLATE" ] && [ -f "$CF_TEMPLATE" ]; then
  echo "[3] Applying configuration template: $CF_TEMPLATE"
  "$ONEC_BIN/ibcmd" infobase config apply \
    --infobase="$DB_NAME" \
    --update-db \
    "$CF_TEMPLATE"
fi

echo "[4] Publishing to Apache"
mkdir -p "$WEB_ROOT/$DB_NAME"

cat > "$APACHE_CONF_DIR/1c-$DB_NAME.conf" << APACHEEOF
Alias /$DB_NAME "$WEB_ROOT/$DB_NAME"
<Directory "$WEB_ROOT/$DB_NAME">
    AllowOverride None
    Options None
    Require all granted
</Directory>
APACHEEOF

cat > "$WEB_ROOT/$DB_NAME/default.vrd" << VRDEOF
<?xml version="1.0" encoding="UTF-8"?>
<point xmlns="http://v8.1c.ru/8.2/virtual-resource-system"
       xmlns:xs="http://www.w3.org/2001/XMLSchema"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       base="/$DB_NAME"
       ib="Srvr=localhost;Ref=$DB_NAME;"
       enable="true">
    <standardOData enable="true"/>
</point>
VRDEOF

a2enconf "1c-$DB_NAME" || true
systemctl reload apache2

echo "[5] Done. Database $DB_NAME is ready at /$DB_NAME"
