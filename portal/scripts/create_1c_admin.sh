#!/bin/bash
# Usage: create_1c_admin.sh <ib_name>
# Создаёт пользователя Administrator через ibcmd
set -euo pipefail

IB_NAME="$1"
IBCMD=/opt/1cv8/current/ibcmd

ADMIN_PASS=$(openssl rand -base64 12)

$IBCMD infobase user create \
  --infobase="$IB_NAME" \
  --name="Администратор" \
  --descr="Portal Admin" \
  --auth-standard \
  --login="admin" \
  --password="$ADMIN_PASS" \
  --role="ПолныеПрава"

# Вывести пароль для перехвата воркером
echo "ADMIN_LOGIN=admin"
echo "ADMIN_PASS=$ADMIN_PASS"
