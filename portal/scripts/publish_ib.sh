#!/bin/bash
# Usage: publish_ib.sh <ib_name> <publish_dir>
set -euo pipefail

IB_NAME="$1"
PUBLISH_DIR="$2"
APACHE_CONF_DIR="/etc/apache2/conf-enabled"

mkdir -p "$PUBLISH_DIR"

# Генерируем VRD-файл публикации
cat > "$PUBLISH_DIR/default.vrd" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<point xmlns="http://v8.1c.ru/8.2/virtual-resource-system"
       xmlns:xs="http://www.w3.org/2001/XMLSchema"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       base="/ibases/$IB_NAME"
       ib="Srvr=localhost;Ref=$IB_NAME;"
       enable="true">
</point>
EOF

# Apache конфиг для базы
cat > "$APACHE_CONF_DIR/${IB_NAME}.conf" <<EOF
Alias /ibases/$IB_NAME "$PUBLISH_DIR"
<Directory "$PUBLISH_DIR">
    AllowOverride None
    Options None
    Order allow,deny
    Allow from all
    SetHandler 1c-application
    ManagedApplicationDescriptor "$PUBLISH_DIR/default.vrd"
</Directory>
EOF

apachectl graceful
echo "IB $IB_NAME published at /ibases/$IB_NAME"
