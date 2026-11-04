#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONF_PATH="$REPO_DIR/nginx.conf"
PID_FILE="/tmp/inter_geo_nginx.pid"
SIZE_PID_FILE="/tmp/inter_geo_layer_size.pid"

if [ -f "$SIZE_PID_FILE" ]; then
    echo "🔄 Restarting dev helper server on 127.0.0.1:8091..."
    if kill -0 "$(cat "$SIZE_PID_FILE")" 2>/dev/null; then
        kill "$(cat "$SIZE_PID_FILE")" 2>/dev/null || true
    fi
    rm -f "$SIZE_PID_FILE"
    setsid node "$SCRIPT_DIR/dev-layer-size-server.mjs" \
        >/tmp/inter_geo_layer_size.log 2>&1 < /dev/null &
    echo $! > "$SIZE_PID_FILE"
fi

if [ ! -f "$PID_FILE" ] || ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "⚠️  Nginx is not running. Starting instead..."
    "$SCRIPT_DIR/nginx-start.sh"
    exit 0
fi

echo "🔄 Reloading Nginx configuration..."
nginx -p "$REPO_DIR" -c "$CONF_PATH" -s reload
echo "✅ Nginx reloaded successfully."
