#!/usr/bin/env bash
# Repodagi yaratilgan karta rasmlarini (content/art/generated, `server/scripts/render-card-art.ts` yaratadi) karta papkasiga ko'chiradi.
# Dizayner haqiqiy rasm bersa, uni `deploy/vps/cards/` ga shu nom bilan qo'ying va ushbu skriptni ISHLATMANG (u ustidan yozadi)
# yoki rasmni `content/art/generated/` dagi bilan almashtirib commit qiling. Docker qayta qurishni talab qilmaydi (papka bog'langan).
set -euo pipefail
cd "$(dirname "$0")"
src=../../content/art/generated; dst=cards
[ -d "$src" ] || { echo "$src yo'q — hech narsa ko'chirilmadi"; exit 0; }
mkdir -p "$dst"; n=0
for f in "$src"/*.webp; do cp -f "$f" "$dst/"; n=$((n+1)); done
echo "karta rasmlari: $n ta ko'chirildi → deploy/vps/$dst"
