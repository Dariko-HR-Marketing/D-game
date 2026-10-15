#!/usr/bin/env bash
# Kunlik baza zaxirasi: siqilgan dump, 14 kun saqlanadi, tekshiriladi. Ixtiyoriy: boshqa joyga nusxa (BACKUP_REMOTE, rclone orqali).
# Ishlatish:   cd /opt/poyga/deploy/vps && bash backup.sh
# Cron (har kuni 03:10):  10 3 * * * cd /opt/poyga/deploy/vps && bash backup.sh >> /var/log/poyga-backup.log 2>&1
set -euo pipefail
DIR="${BACKUP_DIR:-/var/backups/poyga}"; KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$DIR"; f="$DIR/poyga-$(date +%F-%H%M).sql.gz"
docker compose exec -T db pg_dump -U poyga --no-owner poyga | gzip > "$f.tmp"
gzip -t "$f.tmp"                                   # buzilgan arxivni ushlaydi
[ "$(stat -c %s "$f.tmp")" -gt 2000 ] || { echo "XATO: dump juda kichik"; rm -f "$f.tmp"; exit 1; }
mv "$f.tmp" "$f"; chmod 600 "$f"
find "$DIR" -name 'poyga-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) zaxira tayyor: $f ($(du -h "$f" | cut -f1))"
# Boshqa joyga (VPS yo'qolsa ham zaxira qolsin): BACKUP_REMOTE=remote:bucket/poyga  (rclone config oldindan sozlangan bo'lsin)
if [ -n "${BACKUP_REMOTE:-}" ]; then rclone copy "$f" "$BACKUP_REMOTE" && echo "tashqariga ko'chirildi: $BACKUP_REMOTE"; fi
