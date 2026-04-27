#!/bin/bash
# Usage: create_ib.sh <ib_name> <pg_db_name> <cluster_name>
set -euo pipefail

IB_NAME="$1"
PG_DB="$2"
CLUSTER="$3"

IBCMD=/opt/1cv8/current/ibcmd

$IBCMD infobase create \
  --dbms=PostgreSQL \
  --db-server=localhost \
  --db-name="$PG_DB" \
  --db-user=usr1cv8 \
  --db-pwd="$ONEC_PG_PASSWORD" \
  --name="$IB_NAME" \
  --cluster-name="$CLUSTER" \
  --license-distribution=allow

echo "IB $IB_NAME created in cluster $CLUSTER"
