#!/bin/bash
# Запускается от portal_deploy через sudo
# Использование: create_pg_db.sh <db_name>
set -euo pipefail

DB_NAME="$1"

if [[ ! "$DB_NAME" =~ ^onec_[a-z0-9]+$ ]]; then
  echo "ERROR: Invalid db name: $DB_NAME" >&2
  exit 1
fi

su -c "createdb -E UTF8 -T template0 '$DB_NAME'" postgres
echo "PostgreSQL database '$DB_NAME' created"
