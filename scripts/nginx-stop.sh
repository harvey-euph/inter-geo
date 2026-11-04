#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONF_PATH="$REPO_DIR/nginx.conf"
PID_FILE="/tmp/inter_geo_nginx.pid"
SIZE_PID_FILE="/tmp/inter_geo_layer_size.pid"

if [ -f "$SIZE_PID_FILE" ] && kill -0 "$(cat "$SIZE_PID_FILE")" 2>/dev/null; then
    echo "🛑 Stopping dev helper server..."
    kill "$(cat "$SIZE_PID_FILE")" 2>/dev/null || true
    rm -f "$SIZE_PID_FILE"
fi

if [ ! -f "$PID_FILE" ] || ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "ℹ️  Nginx is not running."
    rm -f "$PID_FILE"
    exit 0
fi

echo "🛑 Stopping Nginx..."
nginx -p "$REPO_DIR" -c "$CONF_PATH" -s stop 2>/dev/null || kill "$(cat "$PID_FILE")" 2>/dev/null || true
rm -f "$PID_FILE"
echo "✅ Nginx stopped."
