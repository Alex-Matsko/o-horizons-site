#!/bin/bash
# Опубликовать ИБ в Apache
# Использование: publish_ib.sh <ib_name> <vrd_dir>
set -euo pipefail

IB_NAME="$1"
VRD_DIR="$2"
APACHE_CONF=/etc/apache2/sites-available

mkdir -p "$VRD_DIR"

# Создать VRD
cat > "$VRD_DIR/${IB_NAME}.vrd" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<point xmlns="http://v8.1c.ru/8.2/virtual-resource-system"
       xmlns:xs="http://www.w3.org/2001/XMLSchema"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       base="/$IB_NAME"
       ib="Srvr=localhost;Ref=$IB_NAME;"
       enable="true">
</point>
EOF

# Apache конфиг
cat > "$APACHE_CONF/${IB_NAME}.conf" << EOF
Alias /$IB_NAME "$VRD_DIR"
<Directory "$VRD_DIR">
    AllowOverride None
    Options None
    Order allow,deny
    Allow from all
    SetHandler 1c-application
    ManagedApplicationDescriptor $VRD_DIR/${IB_NAME}.vrd
</Directory>
EOF

a2ensite "${IB_NAME}.conf"
apache2ctl graceful

echo "Infobase '$IB_NAME' published at /$IB_NAME"
