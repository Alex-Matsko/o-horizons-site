#!/bin/bash
# Создать ИБ в кластере 1С через ibcmd
# Использование: create_ib.sh <ib_name> <pg_db_name> <cluster_name>
set -euo pipefail

IB_NAME="$1"
PG_DB="$2"
CLUSTER="$3"

IBCMD=/opt/1cv8/current/ibcmd

$IBCMD infobase create \
  --name="$IB_NAME" \
  --dbms=PostgreSQL \
  --db-server=localhost \
  --db-name="$PG_DB" \
  --db-user=onec_user \
  --db-pwd="$ONEC_DB_PASSWORD" \
  --cluster="$CLUSTER"

echo "1C infobase '$IB_NAME' created"
