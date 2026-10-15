#!/usr/bin/env bash
# Yangi Ubuntu 22.04/24.04 VPS ni tayyorlaydi: yangilanishlar, Docker, xavfsizlik devori, avtomatik xavfsizlik yangilanishlari.
# Ishlatish (root yoki sudo bilan, bir marta):  sudo bash setup.sh
# MUHIM: SSH kalit bilan kirishni sinab ko'rmaguncha parol bilan kirishni o'chirmaydi — buni qo'lda qiling (docs/SERVER.md §2).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "root yoki sudo kerak"; exit 1; }
. /etc/os-release; [ "$ID" = ubuntu ] || echo "OGOHLANTIRISH: skript Ubuntu uchun yozilgan ($ID)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades git

if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable --now docker

# Devor: faqat SSH, HTTP, HTTPS. Postgres va server porti tashqariga ochilmaydi (docker-compose ichki tarmoq).
ufw default deny incoming; ufw default allow outgoing
ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp
ufw --force enable

dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban

mkdir -p /opt/poyga /var/backups/poyga
echo "Tayyor. Keyingi qadam: kodni /opt/poyga ga klonlang, deploy/vps/.env ni to'ldiring (docs/SERVER.md §4–5)."
