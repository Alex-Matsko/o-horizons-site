#!/bin/bash
# Usage: create_pg_db.sh <db_name>
# Runs as portal_deploy with sudo
set -euo pipefail

DB_NAME="$1"

if [[ -z "$DB_NAME" ]]; then
  echo "ERROR: db_name required" >&2
  exit 1i

if [[ ! "$DB_NAME" =~ ^[a-z0-9_]+$ ]]; then
  echo "ERROR: invalid db_name" >&2
  exit 1
fi

sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\" ENCODING 'UTF8' LC_COLLATE 'ru_RU.UTF-8' LC_CTYPE 'ru_RU.UTF-8' TEMPLATE template0;"
echo "DB $DB_NAME created"
