#!/usr/bin/env bash
# Bitta buyruq bilan yangi Ubuntu VPS ga POYGA ni o'rnatadi (swap, Docker, devor, .env, docker compose).
# Ishlatish (root):  curl -fsSL https://raw.githubusercontent.com/Dariko-HR-Marketing/D-game/main/deploy/vps/bootstrap.sh -o /root/bootstrap.sh && nohup bash /root/bootstrap.sh >/dev/null 2>&1 &
# Jurnal: /root/poyga-deploy.log. Qayta ishga tushirish xavfsiz: mavjud .env (parollar) o'zgarmaydi.
# Domenlar o'zgartirilsa: API_DOMAIN, APP_DOMAIN, ADMIN_DOMAIN muhit o'zgaruvchilari bilan bering.
set -euo pipefail
exec > >(tee -a /root/poyga-deploy.log) 2>&1
echo "=== POYGA boshlandi $(date -Is) ==="
APP_DOMAIN="${APP_DOMAIN:-tajriba24.uz}"; API_DOMAIN="${API_DOMAIN:-api.$APP_DOMAIN}"; ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.$APP_DOMAIN}"
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get install -y git openssl
if [ ! -d /opt/poyga/.git ]; then git clone https://github.com/Dariko-HR-Marketing/D-game.git /opt/poyga; else git -C /opt/poyga pull --ff-only; fi
bash /opt/poyga/deploy/vps/setup.sh
cd /opt/poyga/deploy/vps
if [ ! -f .env ]; then
  ADMINPW="Poyga-$(openssl rand -hex 6)-9x"
  cat > .env <<EOF
API_DOMAIN=$API_DOMAIN
APP_DOMAIN=$APP_DOMAIN
ADMIN_DOMAIN=$ADMIN_DOMAIN
POSTGRES_PASSWORD=$(openssl rand -hex 24)
AUTH_SECRET=$(openssl rand -hex 32)
PAYMENT_WEBHOOK_SECRET=$(openssl rand -hex 24)
ADMIN_BOOTSTRAP_LOGIN=admin
ADMIN_BOOTSTRAP_PASSWORD=$ADMINPW
ADMIN_REQUIRE_2FA=1
NODE_ENV=staging
SMS_PROVIDER=console
EOF
  chmod 600 .env
  printf 'login: admin\nparol: %s\n' "$ADMINPW" > /root/poyga-admin-parol.txt; chmod 600 /root/poyga-admin-parol.txt
fi
docker compose up -d --build
docker compose ps
echo "=== TAYYOR $(date -Is) ==="
