#!/bin/sh
set -eu
mkdir -p backups
STAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec -T mysql mysqldump -uroot -proot123 radio_amigos_digital | gzip > "backups/mysql_${STAMP}.sql.gz"
tar -czf "backups/uploads_${STAMP}.tar.gz" uploads
find backups -type f -mtime +14 -delete
echo "Backup concluido: ${STAMP}"
