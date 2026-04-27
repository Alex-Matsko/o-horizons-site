#!/bin/bash
# Загрузить конфигурацию из CF-файла в ИБ
# Использование: load_cf.sh <ib_name> <cf_path>
set -euo pipefail

IB_NAME="$1"
CF_PATH="$2"

if [ ! -f "$CF_PATH" ]; then
  echo "ERROR: CF file not found: $CF_PATH" >&2
  exit 1
fi

/opt/1cv8/current/1cv8 DESIGNER \
  /S "localhost\$IB_NAME" \
  /LoadCfg "$CF_PATH" \
  /UpdateDBCfg \
  -UC portal_unlock

echo "Configuration loaded into '$IB_NAME'"
