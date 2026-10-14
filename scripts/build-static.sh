#!/usr/bin/env bash
# Statik paketlar (cPanel/har qanday statik hosting uchun): client va admin, .htaccess bilan.
# Ishlatish:  scripts/build-static.sh wss://api.dariko.uz https://api.dariko.uz
set -euo pipefail
WS="${1:?server WebSocket manzili kerak, masalan wss://api.dariko.uz}"
HTTP="${2:?server HTTP manzili kerak, masalan https://api.dariko.uz}"
case "$WS" in wss://*) ;; *) echo "Xato: birinchi argument wss:// bilan boshlanishi kerak (ws:// emas)"; exit 1;; esac
case "$HTTP" in https://*) ;; *) echo "Xato: ikkinchi argument https:// bilan boshlanishi kerak"; exit 1;; esac
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$ROOT/dist-packages"; rm -rf "$OUT"; mkdir -p "$OUT"
cd "$ROOT"
EXPO_PUBLIC_SERVER_URL="$WS" CI=1 pnpm --filter @poyga/client export:web
VITE_API_URL="$HTTP" pnpm --filter @poyga/admin build
# manzil haqiqatan bundlega kirganini tekshiramiz (Metro keshi tufayli eski qiymat qolmasin)
grep -rqF "$WS" client/dist/_expo/static/js/web/ || { echo "Xato: $WS mijoz bundlesida topilmadi"; exit 1; }
grep -rqF "$HTTP" admin/dist/assets/ || { echo "Xato: $HTTP admin bundlesida topilmadi"; exit 1; }
for app in client admin; do
  cp deploy/cpanel/.htaccess "$app/dist/.htaccess"
  (cd "$app/dist" && zip -qr "$OUT/poyga-$app.zip" . -x '.DS_Store')
done
echo "Tayyor:"; ls -lh "$OUT"
