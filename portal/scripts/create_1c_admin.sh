#!/bin/bash
# Создать пользователя-администратора в новой ИБ
# Использование: create_1c_admin.sh <ib_name>
set -euo pipefail

IB_NAME="$1"
ADMIN_LOGIN="admin"
ADMIN_PASS=$(openssl rand -base64 12)

/opt/1cv8/current/1cv8 DESIGNER \
  /S "localhost\$IB_NAME" \
  /CreateInfoBase \
  /AddUser \
  /Name "$ADMIN_LOGIN" \
  /Password "$ADMIN_PASS" \
  /Role "ПолныеПрава" \
  -UC portal_unlock

# Сохранить пароль в файл для последующего считывания порталом
echo "$ADMIN_PASS" > "/tmp/1c_admin_pass_${IB_NAME}.txt"
chmod 600 "/tmp/1c_admin_pass_${IB_NAME}.txt"

echo "Admin user created for '$IB_NAME'"
