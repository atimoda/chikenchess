#!/usr/bin/env bash
# One-time setup of the game server VPS (Ubuntu 24.04, as root). Safe to run again.
#   curl -fsSL https://raw.githubusercontent.com/atimoda/chikenchess/main/server/deploy/setup.sh | bash
# Installs Docker, opens only SSH/HTTP/HTTPS, clones the repo to /opt/chickenchess, writes server/deploy/.env
# from env.example (kept if it exists), starts the server and turns on the automatic update (update.sh, every
# minute: rebuilds when server/ changed on the branch). BRANCH=<name> to follow another branch.
set -euo pipefail
REPO="${REPO:-https://github.com/atimoda/chikenchess.git}"
BRANCH="${BRANCH:-main}"
DIR=/opt/chickenchess
export DEBIAN_FRONTEND=noninteractive

[ "$(id -u)" = 0 ] || { echo "run as root (sudo -i)"; exit 1; }

echo "== packages"
apt-get update -q
apt-get install -yq ca-certificates curl git ufw
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

echo "== swap (1 GB machines need it for builds)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== firewall: ssh, http (certificate), https"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null
ufw --force enable

echo "== code ($BRANCH)"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch -q origin "$BRANCH" && git -C "$DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
else
  git clone -q --branch "$BRANCH" "$REPO" "$DIR"
fi
echo "$BRANCH" > "$DIR/.deploy-branch"
cd "$DIR/server/deploy"
[ -f .env ] || cp env.example .env

echo "== start"
docker compose up -d --build

echo "== automatic update every minute"
cat > /etc/systemd/system/chickenchess-update.service <<UNIT
[Unit]
Description=Update the ChickenChess game server from GitHub
[Service]
Type=oneshot
ExecStart=/bin/bash $DIR/server/deploy/update.sh
UNIT
cat > /etc/systemd/system/chickenchess-update.timer <<UNIT
[Unit]
Description=Check GitHub for game server changes every minute
[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now chickenchess-update.timer

. ./.env
echo
echo "Pronto. Teste: curl https://$GAME_DOMAIN/health  (o certificado sai assim que o DNS apontar para esta máquina)"
