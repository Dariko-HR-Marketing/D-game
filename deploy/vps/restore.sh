#!/usr/bin/env bash
# Zaxiradan tiklash (OGOHLANTIRISH: joriy bazani almashtiradi). Ishlatish:  bash restore.sh /var/backups/tajriba24/tajriba24-2026-01-01-0310.sql.gz
set -euo pipefail
. "$(dirname "$0")/lib.sh"
f="${1:?zaxira fayli kerak}"; [ -f "$f" ] || { echo "fayl yo'q: $f"; exit 1; }
gzip -t "$f"
read -r -p "Joriy baza O'CHIRILIB $f dan tiklanadi. Davom etamizmi? (ha/yo'q) " a; [ "$a" = ha ] || exit 1
docker compose stop server
docker compose exec -T db psql -U "$DB_USER" -d postgres -c "drop database \"$DB_NAME\"" -c "create database \"$DB_NAME\" owner \"$DB_USER\""
gunzip -c "$f" | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 >/dev/null
docker compose start server
echo "Tiklandi. Tekshiring: curl -s https://\$API_DOMAIN/ready"
