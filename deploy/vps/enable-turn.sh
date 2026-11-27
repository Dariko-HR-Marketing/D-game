#!/usr/bin/env bash
# Ovozli aloqa uchun TURN (coturn) ni yoqadi: sirni yaratadi, .env ni yangilaydi, xavfsizlik devorini ochadi, coturn va serverni qayta ishga tushiradi.
# Ishlatish (serverda, root): cd /opt/tajriba24/deploy/vps && bash enable-turn.sh
# Ixtiyoriy: TURN_EXTERNAL_IP=1.2.3.4 bash enable-turn.sh   (IP ni o'zi aniqlay olmasa)
#            DRY_RUN=1 bash enable-turn.sh                    (hech narsa ishga tushirmaydi, faqat .env ni sinab ko'radi)
# Sir hech qayerga chiqarilmaydi (chatga ham, jurnalga ham). Skript qayta ishga tushirilsa mavjud sirni saqlaydi.
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE="${ENV_FILE:-.env}"; DRY="${DRY_RUN:-0}"
[ -f "$ENV_FILE" ] || { echo "XATO: $ENV_FILE topilmadi. Skriptni deploy/vps papkasida ishga tushiring."; exit 1; }

get() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }
set_kv() { # set_kv KEY VALUE — bor bo'lsa almashtiradi, yo'q bo'lsa qo'shadi (qiymat jurnalga chiqmaydi)
  local k="$1" v="$2" tmp; tmp="$(mktemp)"
  if grep -qE "^$k=" "$ENV_FILE"; then awk -v k="$k" -v v="$v" 'BEGIN{FS=OFS="="} $1==k{print k"="v; next} {print}' "$ENV_FILE" > "$tmp"; else cp "$ENV_FILE" "$tmp"; printf '%s=%s\n' "$k" "$v" >> "$tmp"; fi
  cat "$tmp" > "$ENV_FILE"; rm -f "$tmp"
}

# 1) Sir: bor bo'lsa saqlanadi, yo'q bo'lsa yaratiladi (kamida 16 belgi talab qilinadi)
SECRET="$(get TURN_SECRET)"
if [ "${#SECRET}" -lt 16 ]; then SECRET="$(openssl rand -hex 32)"; set_kv TURN_SECRET "$SECRET"; echo "TURN_SECRET yaratildi (qiymati ko'rsatilmaydi)."; else echo "TURN_SECRET mavjud, saqlandi."; fi

# 2) Serverning ochiq IP si
IP="${TURN_EXTERNAL_IP:-$(get TURN_EXTERNAL_IP)}"
if [ -z "$IP" ] && [ "$DRY" != "1" ]; then IP="$(curl -fsS --max-time 8 https://api.ipify.org || curl -fsS --max-time 8 https://ifconfig.me || true)"; fi
[ -z "$IP" ] && [ "$DRY" = "1" ] && IP="203.0.113.10"
echo "$IP" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || { echo "XATO: ochiq IP aniqlanmadi. Qo'lda bering: TURN_EXTERNAL_IP=1.2.3.4 bash enable-turn.sh"; exit 1; }
set_kv TURN_EXTERNAL_IP "$IP"

# 3) Domen (realm) va manzillar
REALM="$(get TURN_REALM)"; [ -n "$REALM" ] || REALM="$(get APP_DOMAIN)"; [ -n "$REALM" ] || REALM="tajriba24.uz"
set_kv TURN_REALM "$REALM"
set_kv TURN_URLS "turn:$IP:3478?transport=udp,turn:$IP:3478?transport=tcp"
echo "Sozlandi: IP=$IP realm=$REALM manzillar: UDP va TCP 3478 (TLS/5349 hozircha yo'q: domen sertifikati kerak)."

[ "$DRY" = "1" ] && { echo "DRY_RUN: .env yangilandi, ishga tushirish o'tkazib yuborildi."; exit 0; }

# 4) Xavfsizlik devori (ufw bo'lsa). VPS panelidagi (provayder) devor alohida: portlarni u yerda ham oching.
MINP="$(get TURN_MIN_PORT)"; MINP="${MINP:-49152}"; MAXP="$(get TURN_MAX_PORT)"; MAXP="${MAXP:-49452}"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 3478/udp >/dev/null; ufw allow 3478/tcp >/dev/null; ufw allow "$MINP:$MAXP/udp" >/dev/null
  echo "ufw: 3478 (udp+tcp) va $MINP–$MAXP (udp) ochildi."
else
  echo "ESLATMA: ufw faol emas. Agar boshqa devor bo'lsa, ochiq bo'lishi kerak: 3478 udp+tcp, $MINP-$MAXP udp."
fi

# 5) coturn va serverni ishga tushirish (server yangi muhit o'zgaruvchilarini o'qishi uchun qayta yaratiladi)
docker compose --profile turn up -d turn
docker compose up -d server
sleep 6

# 6) Tekshiruv
echo "--- coturn holati:"; docker compose ps turn || true
if ss -lunp 2>/dev/null | grep -q ":3478"; then echo "OK: UDP 3478 tinglanmoqda."; else echo "OGOHLANTIRISH: UDP 3478 tinglanmayapti. Jurnal: docker compose logs --tail=40 turn"; fi
if docker compose logs --tail=30 turn 2>&1 | grep -qiE "error|cannot|fatal"; then echo "OGOHLANTIRISH: coturn jurnalida xato bor: docker compose logs --tail=40 turn"; fi
echo "--- Tayyor. Endi admin panel → Tizim sahifasida «Ovozli aloqa: TURN yoqilgan» chiqishi kerak."
echo "Sinov: ikki xil tarmoqdan (masalan, Wi-Fi va mobil internet) bitta o'yinga kirib, «Ovozga qo'shilish» ni bosing."
