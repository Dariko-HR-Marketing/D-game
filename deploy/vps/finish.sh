#!/usr/bin/env bash
# Yakuniy qadamlar: zaxira -> yangilanish -> tiklash sinovi -> (ixtiyoriy) tashqi zaxira -> hisobot.
# Ishlatish (serverda, root):
#   cd /opt/poyga/deploy/vps && bash finish.sh                       # yangilanish + sinovlar, reboot YO'Q
#   BACKUP_REMOTE=poyga-crypt:poyga bash finish.sh                   # + tashqi zaxirani cron'ga ulash (rclone oldindan sozlangan bo'lsin)
#   bash finish.sh --reboot                                          # oxirida 1 daqiqadan keyin qayta yuklaydi
#   bash finish.sh --verify                                          # reboot'dan KEYIN: holatni tekshiradi
# Hisobot: /root/finish-report.txt (parol/token yozilmaydi). SSH, ufw va .env ga tegmaydi.
set -uo pipefail
cd "$(dirname "$0")"
[ "$(id -u)" = 0 ] || { echo "root bo'lib ishga tushiring"; exit 1; }
REPORT=/root/finish-report.txt; DO_REBOOT=0; VERIFY=0
for a in "$@"; do case "$a" in --reboot) DO_REBOOT=1;; --verify) VERIFY=1;; esac; done
exec > >(tee -a "$REPORT") 2>&1
echo; echo "######## finish.sh $(date -Is) ($*)"
ok=0; warn=0; bad=0
P() { echo "  [OK]   $*"; ok=$((ok+1)); }
W() { echo "  [OGOH] $*"; warn=$((warn+1)); }
F() { echo "  [XATO] $*"; bad=$((bad+1)); }
API=$(grep -E '^API_DOMAIN=' .env 2>/dev/null | cut -d= -f2- | tr -d '"')
ready() { [ -n "$API" ] && [ "$(curl -s -o /dev/null -w '%{http_code}' -m 10 "https://$API/ready")" = 200 ]; }

if [ "$VERIFY" = 1 ]; then
  echo "== Reboot'dan keyingi tekshiruv"
  uptime -p
  [ -f /var/run/reboot-required ] && W "hali qayta yuklash kerak" || P "qayta yuklash talab qilinmaydi"
  docker compose ps --format '{{.Service}} {{.Status}}'
  for s in db server web; do docker compose ps --format '{{.Service}} {{.Status}}' | grep "^$s " | grep -q Up && P "$s Up" || F "$s ko'tarilmadi"; done
  ready && P "https://$API/ready = 200" || F "/ready javob bermadi"
  systemctl is-active --quiet fail2ban && P "fail2ban" || F "fail2ban yo'q"
  ufw status | grep -q "Status: active" && P "ufw" || F "ufw o'chiq"
  echo; [ -x ./audit.sh ] || chmod +x audit.sh 2>/dev/null; bash ./audit.sh
  echo "Natija: OK=$ok OGOH=$warn XATO=$bad"; exit 0
fi

echo "== 0. Boshlang'ich holat"
ready && P "/ready = 200 (boshlashdan oldin)" || { F "/ready ishlamayapti: to'xtatildi, yangilanish qilinmaydi"; exit 1; }
df -h / | tail -1

echo "== 1. Yangilanishdan OLDIN zaxira"
if bash ./backup.sh; then P "zaxira olindi"; else F "zaxira olinmadi: to'xtatildi"; exit 1; fi

echo "== 2. Tiklash sinovi (vaqtinchalik baza)"
last=$(ls -t /var/backups/poyga/poyga-*.sql.gz 2>/dev/null | head -1)
ls -l "$last"
docker compose exec -T db psql -U poyga -d postgres -qc "drop database if exists poyga_finish" -c "create database poyga_finish owner poyga" >/dev/null 2>&1
if gunzip -c "$last" | docker compose exec -T db psql -U poyga -d poyga_finish -v ON_ERROR_STOP=1 >/dev/null 2>&1; then
  t=$(docker compose exec -T db psql -U poyga -d poyga_finish -Atc "select count(*) from information_schema.tables where table_schema='public'" | tr -d '\r')
  [ "${t:-0}" -gt 0 ] && P "zaxira TIKLANADI ($t jadval)" || F "tiklandi, lekin jadvallar yo'q"
else F "zaxirani tiklab bo'lmadi (yangilanish davom etmaydi)"; fi
docker compose exec -T db psql -U poyga -d postgres -qc "drop database if exists poyga_finish" >/dev/null 2>&1
[ "$bad" -eq 0 ] || { echo "Natija: OK=$ok OGOH=$warn XATO=$bad (to'xtadi)"; exit 1; }

echo "== 3. Tizim yangilanishi"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get -y -qq -o Dpkg::Options::=--force-confold upgrade && P "apt upgrade bajarildi" || F "apt upgrade xato"
n=$(apt list --upgradable 2>/dev/null | grep -c upgradable || true); echo "     qolgan yangilanish: $n"
[ -f /var/run/reboot-required ] && W "qayta yuklash kerak (yadro/kutubxona yangilandi)" || P "qayta yuklash talab qilinmaydi"
ready && P "yangilanishdan keyin /ready = 200" || F "/ready yangilanishdan keyin ishlamayapti"

echo "== 4. Tashqi zaxira"
if [ -z "${BACKUP_REMOTE:-}" ]; then
  W "BACKUP_REMOTE berilmadi: tashqi zaxira ulanmadi (rclone sozlagach: BACKUP_REMOTE=nom:yol bash finish.sh)"
elif ! command -v rclone >/dev/null; then
  F "rclone o'rnatilmagan (apt install -y rclone, keyin rclone config)"
elif ! rclone lsd "${BACKUP_REMOTE%%:*}:" >/dev/null 2>&1; then
  F "rclone remote '${BACKUP_REMOTE%%:*}' ishlamayapti (rclone config ni tekshiring)"
else
  if rclone copy "$last" "$BACKUP_REMOTE" && rclone ls "$BACKUP_REMOTE" | grep -q "$(basename "$last")"; then
    P "zaxira tashqariga ko'chirildi va ko'rinadi: $BACKUP_REMOTE"
    cur=$(crontab -l 2>/dev/null || true)
    if echo "$cur" | grep -q 'backup.sh' && ! echo "$cur" | grep -q 'BACKUP_REMOTE='; then
      echo "$cur" | sed "/backup\.sh/ s|cd \([^&]*\) && |cd \1 \&\& BACKUP_REMOTE=$BACKUP_REMOTE |" | crontab - && P "cron yangilandi (BACKUP_REMOTE qo'shildi)" || W "cron'ni qo'lda yangilang"
    fi
    crontab -l | grep backup.sh | sed 's/^/     cron: /'
  else F "tashqariga ko'chirib bo'lmadi"; fi
fi

echo "== 5. Yakuniy audit"
[ -f ./audit.sh ] && bash ./audit.sh || W "audit.sh yo'q (git fetch qiling)"

echo; echo "Natija: OK=$ok  OGOH=$warn  XATO=$bad"
if [ "$DO_REBOOT" = 1 ]; then
  [ "$bad" -eq 0 ] || { echo "XATO bor: reboot qilinmadi"; exit 1; }
  echo "1 daqiqadan keyin qayta yuklanadi. Keyin: cd $(pwd) && bash finish.sh --verify"; shutdown -r +1 "finish.sh reboot"
fi
echo "Hisobot: $REPORT"
