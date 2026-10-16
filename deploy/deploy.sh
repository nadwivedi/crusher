#!/usr/bin/env bash
# Pulls the latest code and updates the live server. Started by the Deploy button in the admin panel.
#
#   deploy.sh <target> <install>
#     target:  all | frontend | admin | webpage | backend
#     install: 1 = run "npm ci" before building (after package.json changes), 0 = skip it
#
# The sites are built into dist-next and only swapped in when the build works, so a failed build
# leaves the live site as it was. nginx serves the dist folders directly, so a new build is live
# without restarting nginx. The backend is restarted last, because restarting it ends this request.

set -uo pipefail

TARGET="${1:-all}"
INSTALL="${2:-0}"
REPO_DIR="${DEPLOY_REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PM2_NAME="${DEPLOY_PM2_NAME:-crusher}"
BRANCH="${DEPLOY_BRANCH:-main}"
STATE_DIR="$REPO_DIR/.deploy"
STATE_FILE="$STATE_DIR/state.json"
HISTORY_FILE="$STATE_DIR/history.jsonl"
DEPLOY_ID="${DEPLOY_ID:-$(date +%s)}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$STATE_DIR"

# Only one deploy at a time
exec 9>"$STATE_DIR/deploy.lock"
if ! flock -n 9; then
  echo "Another deploy is already running."
  exit 1
fi

write_state() {
  local status="$1" finished="${2:-}"
  local commit
  commit="$(git -C "$REPO_DIR" log -1 --format='%h %s' 2>/dev/null | sed 's/\\/\\\\/g; s/"/\\"/g')"
  printf '{"id":"%s","target":"%s","install":%s,"status":"%s","startedAt":"%s","finishedAt":%s,"commit":"%s"}\n' \
    "$DEPLOY_ID" "$TARGET" "$([ "$INSTALL" = "1" ] && echo true || echo false)" "$status" "$STARTED_AT" \
    "$([ -n "$finished" ] && echo "\"$finished\"" || echo null)" "$commit" > "$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
}

finish() {
  local status="$1"
  write_state "$status" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  cat "$STATE_FILE" >> "$HISTORY_FILE"
  # Keep the last 50 deploys
  tail -n 50 "$HISTORY_FILE" > "$HISTORY_FILE.tmp" && mv "$HISTORY_FILE.tmp" "$HISTORY_FILE"
  echo
  if [ "$status" = "success" ]; then echo "✅ Deploy finished"; else echo "❌ Deploy failed"; fi
  exit $([ "$status" = "success" ] && echo 0 || echo 1)
}

step() { echo; echo "▶ $*"; }

write_state running

case "$TARGET" in
  all|frontend|admin|webpage|backend) ;;
  *) echo "Unknown target: $TARGET"; finish failed ;;
esac

echo "Deploy #$DEPLOY_ID · target: $TARGET · npm install: $([ "$INSTALL" = "1" ] && echo yes || echo no)"
echo "Folder: $REPO_DIR"

cd "$REPO_DIR" || finish failed

step "git pull origin $BRANCH"
BEFORE="$(git rev-parse --short HEAD)"
if ! git pull --ff-only origin "$BRANCH"; then
  echo "git pull failed. If files were edited on the server, run 'git status' there and undo those edits."
  finish failed
fi
AFTER="$(git rev-parse --short HEAD)"
if [ "$BEFORE" = "$AFTER" ]; then echo "Already up to date ($AFTER)"; else echo "Updated $BEFORE → $AFTER"; fi
git log -1 --format='Latest commit: %h %s (%an, %ar)'
write_state running

install_deps() {
  local dir="$1"
  if [ "$INSTALL" = "1" ]; then
    step "npm ci in $dir"
    (cd "$REPO_DIR/$dir" && npm ci --no-audit --no-fund) || return 1
  fi
}

build_site() {
  local dir="$1"
  install_deps "$dir" || return 1
  step "npm run build in $dir"
  cd "$REPO_DIR/$dir" || return 1
  rm -rf dist-next
  npm run build -- --outDir dist-next --emptyOutDir || { rm -rf dist-next; cd "$REPO_DIR"; return 1; }
  rm -rf dist-old
  [ -d dist ] && mv dist dist-old
  mv dist-next dist
  rm -rf dist-old
  echo "$dir is live"
  cd "$REPO_DIR"
}

FAILED=0
for site in frontend admin webpage; do
  if [ "$TARGET" = "all" ] || [ "$TARGET" = "$site" ]; then
    build_site "$site" || { echo "Build of $site failed — the live $site was not changed."; FAILED=1; }
  fi
done

if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
  if install_deps backend; then
    step "pm2 restart $PM2_NAME"
    # Write the result first: the restart ends the backend that is watching this deploy
    if [ "$FAILED" = "0" ]; then
      write_state success "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      cat "$STATE_FILE" >> "$HISTORY_FILE"
      echo "✅ Code updated, restarting the backend…"
      pm2 restart "$PM2_NAME" --update-env || { echo "pm2 restart failed"; sed -i '$ d' "$HISTORY_FILE"; finish failed; }
      echo "Backend restarted"
      exit 0
    fi
    pm2 restart "$PM2_NAME" --update-env || echo "pm2 restart failed"
  else
    echo "npm ci in backend failed — the backend was not restarted."
    FAILED=1
  fi
fi

[ "$FAILED" = "0" ] && finish success || finish failed
