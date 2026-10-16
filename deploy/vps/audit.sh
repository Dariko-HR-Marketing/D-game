#!/usr/bin/env bash
# Faqat o'qiydi (hech narsani o'zgartirmaydi; zaxira sinovi vaqtinchalik bazada o'tadi va o'chiriladi).
# Ishlatish (serverda, root):  cd /opt/poyga/deploy/vps && bash audit.sh
cd "$(dirname "$0")"
ok=0; warn=0; bad=0
P() { echo "  [OK]   $*"; ok=$((ok+1)); }
W() { echo "  [OGOH] $*"; warn=$((warn+1)); }
F() { echo "  [XATO] $*"; bad=$((bad+1)); }

echo "== 1. Konteynerlar"
docker compose ps --format '{{.Service}} {{.Status}}' 2>/dev/null | while read -r l; do echo "     $l"; done
for s in db server web caddy; do
  st=$(docker compose ps --format '{{.Service}} {{.Status}}' 2>/dev/null | grep "^$s " || true)
  [ -z "$st" ] && continue
  echo "$st" | grep -q "Up" && P "$s ishlayapti" || F "$s ishlamayapti"
done
r=$(docker inspect -f '{{.Name}} {{.HostConfig.RestartPolicy.Name}}' $(docker compose ps -q) 2>/dev/null | grep -v -E 'always|unless-stopped' || true)
[ -z "$r" ] && P "restart siyosati bor (qayta yoqilganda o'zi ko'tariladi)" || W "restart siyosati yo'q: $r"

echo "== 2. Tarmoq va firewall"
pub=$(ss -ltnH | awk '{print $4}' | grep -v -E '^(127\.|\[::1\]|\[::\]:(22|80|443)$|0\.0\.0\.0:(22|80|443)$|\*:(22|80|443)$)' || true)
echo "$pub" | grep -q -E ':(5432|3000|8080)$' && F "ichki port tashqariga ochiq: $(echo "$pub" | tr '\n' ' ')" || P "baza/server portlari tashqariga ochiq emas"
ufw status | grep -q "Status: active" && P "ufw faol" || F "ufw o'chiq"
# Docker ufw'ni aylanib o'tadi: faqat 80/443 e'lon qilinganini tekshiramiz
docker ps --format '{{.Names}} {{.Ports}}' | grep -E '0\.0\.0\.0:[0-9]+' | grep -v -E ':(80|443)->' && W "Docker 80/443 dan boshqa portni e'lon qilgan (yuqoriga qarang)" || P "Docker faqat 80/443 ni e'lon qiladi"
systemctl is-active --quiet fail2ban && P "fail2ban faol" || F "fail2ban faol emas"
fail2ban-client status sshd 2>/dev/null | grep -E 'Currently banned|Total banned' | sed 's/^/     /'

echo "== 3. SSH"
sshd -T 2>/dev/null > /tmp/sshd.$$ || true
g() { awk -v k="$1" '$1==k{print $2}' /tmp/sshd.$$; }
[ "$(g passwordauthentication)" = no ] && P "parol bilan kirish o'chiq" || W "parol bilan kirish YOQILGAN (kalit o'rnatib, PasswordAuthentication no qiling)"
case "$(g permitrootlogin)" in no|prohibit-password|without-password) P "root parol bilan kirmaydi";; *) W "PermitRootLogin=$(g permitrootlogin)";; esac
[ -s /root/.ssh/authorized_keys ] && P "root uchun SSH kalit bor" || W "authorized_keys bo'sh: avval kalit qo'shing, keyin parolni o'chiring"
rm -f /tmp/sshd.$$

echo "== 4. Yangilanishlar"
systemctl is-enabled --quiet unattended-upgrades 2>/dev/null && P "avtomatik xavfsizlik yangilanishlari yoqilgan" || W "unattended-upgrades yoqilmagan"
[ -f /var/run/reboot-required ] && W "qayta yuklash kerak (yadro yangilangan)" || P "qayta yuklash talab qilinmaydi"
n=$(apt list --upgradable 2>/dev/null | grep -c upgradable || true); [ "${n:-0}" -le 5 ] && P "kutayotgan yangilanish: $n" || W "kutayotgan yangilanish: $n"

echo "== 5. Sirlar"
f=$(ls .env ../../.env 2>/dev/null | head -1)
if [ -n "$f" ]; then
  [ "$(stat -c %a "$f")" = 600 ] && P "$f ruxsati 600" || W "$f ruxsati $(stat -c %a "$f") (chmod 600 $f)"
  grep -q -E '^ADMIN_BOOTSTRAP_PASSWORD=.+' "$f" && W "ADMIN_BOOTSTRAP_PASSWORD hali .env da (2FA sozlangach olib tashlang)" || P "bootstrap parol .env da yo'q"
  grep -q -E '^ADMIN_TOKENS=.+' "$f" && W "eski ADMIN_TOKENS to'ldirilgan (2FA ostida emas)" || P "eski ADMIN_TOKENS bo'sh"
  grep -q -E '^ADMIN_REQUIRE_2FA=0' "$f" && F "2FA o'chirilgan" || P "2FA majburiy"
else W ".env topilmadi"; fi
ls /root/poyga-admin-parol.txt 2>/dev/null && F "/root/poyga-admin-parol.txt hali bor" || P "parol fayli yo'q"

echo "== 6. Zaxira"
D=/var/backups/poyga
crontab -l 2>/dev/null | grep -q backup.sh && P "cron'da backup.sh bor: $(crontab -l | grep backup.sh | head -1)" || F "cron'da zaxira yo'q"
last=$(ls -t $D/poyga-*.sql.gz 2>/dev/null | head -1)
if [ -n "$last" ]; then
  age=$(( ( $(date +%s) - $(stat -c %Y "$last") ) / 3600 ))
  [ "$age" -le 26 ] && P "oxirgi zaxira $age soat oldin ($(du -h "$last" | cut -f1))" || F "oxirgi zaxira $age soat oldin: eski"
  gzip -t "$last" && P "arxiv butun" || F "arxiv buzilgan"
  echo "     zaxiralar soni: $(ls $D/poyga-*.sql.gz | wc -l)"
else F "zaxira fayli yo'q ($D)"; fi
command -v rclone >/dev/null && rclone listremotes | grep -q . && P "rclone sozlangan (BACKUP_REMOTE ni cron'ga qo'shing)" \
  || W "serverdan TASHQARI zaxira yo'q: VPS yo'qolsa zaxira ham yo'qoladi"
if [ -n "$last" ]; then
  echo "     tiklash sinovi (vaqtinchalik baza)..."
  docker compose exec -T db psql -U poyga -d postgres -qc "drop database if exists poyga_audit" -c "create database poyga_audit owner poyga" >/dev/null 2>&1
  if gunzip -c "$last" | docker compose exec -T db psql -U poyga -d poyga_audit -v ON_ERROR_STOP=1 >/dev/null 2>&1; then
    t=$(docker compose exec -T db psql -U poyga -d poyga_audit -Atc "select count(*) from information_schema.tables where table_schema='public'" | tr -d '\r')
    [ "${t:-0}" -gt 0 ] && P "zaxira tiklanadi ($t jadval)" || F "tiklandi, lekin jadvallar yo'q"
  else F "zaxirani tiklab bo'lmadi"; fi
  docker compose exec -T db psql -U poyga -d postgres -qc "drop database if exists poyga_audit" >/dev/null 2>&1
fi

echo "== 7. Resurslar"
u=$(df --output=pcent / | tail -1 | tr -dc 0-9); [ "$u" -lt 80 ] && P "disk $u%" || W "disk $u% band"
m=$(free -m | awk '/Mem/{printf "%d", $7*100/$2}'); [ "$m" -gt 15 ] && P "bo'sh xotira ~$m%" || W "xotira kam (~$m% bo'sh)"
swapon --show | grep -q . && P "swap bor" || W "swap yo'q (kichik VPS uchun tavsiya)"
timedatectl show -p NTPSynchronized --value 2>/dev/null | grep -q yes && P "vaqt sinxron" || W "vaqt sinxron emas"

echo; echo "Natija: OK=$ok  OGOH=$warn  XATO=$bad"; [ "$bad" -eq 0 ]
