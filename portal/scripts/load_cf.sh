#!/bin/bash
# Usage: load_cf.sh <ib_name> <cf_path>
set -euo pipefail

IB_NAME="$1"
CF_PATH="$2"

IBCMD=/opt/1cv8/current/ibcmd

$IBCMD infobase config import \
  --infobase="$IB_NAME" \
  "$CF_PATH"

$IBCMD infobase config apply \
  --infobase="$IB_NAME" \
  --force

echo "CF loaded and applied for $IB_NAME"
