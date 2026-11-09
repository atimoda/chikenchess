#!/usr/bin/env bash
# Run every minute by chickenchess-update.timer: when the followed branch moved and something under server/
# changed, pull and rebuild. Logs: journalctl -u chickenchess-update
set -euo pipefail
DIR=/opt/chickenchess
BRANCH="$(cat "$DIR/.deploy-branch" 2>/dev/null || echo main)"
cd "$DIR"
git fetch -q origin "$BRANCH"
[ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ] && exit 0
changed="$(git diff --name-only HEAD "origin/$BRANCH" -- server/)"
git checkout -q -B "$BRANCH" "origin/$BRANCH"
[ -z "$changed" ] && exit 0
echo "server changed, rebuilding:"; echo "$changed"
cd server/deploy
docker compose up -d --build
docker image prune -f >/dev/null
