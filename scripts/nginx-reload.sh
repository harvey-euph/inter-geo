#!/usr/bin/env bash
set -e

CONF_PATH="/home/harvey/inter-geo/nginx.conf"
PID_FILE="/tmp/inter_geo_nginx.pid"
SIZE_PID_FILE="/tmp/inter_geo_layer_size.pid"

if [ -f "$SIZE_PID_FILE" ]; then
    echo "🔄 Restarting dev helper server on 127.0.0.1:8091..."
    if kill -0 "$(cat "$SIZE_PID_FILE")" 2>/dev/null; then
        kill "$(cat "$SIZE_PID_FILE")" 2>/dev/null || true
    fi
    rm -f "$SIZE_PID_FILE"
    setsid node /home/harvey/inter-geo/scripts/dev-layer-size-server.mjs \
        >/tmp/inter_geo_layer_size.log 2>&1 < /dev/null &
    echo $! > "$SIZE_PID_FILE"
fi

if [ ! -f "$PID_FILE" ] || ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "⚠️  Nginx is not running. Starting instead..."
    /home/harvey/inter-geo/scripts/nginx-start.sh
    exit 0
fi

echo "🔄 Reloading Nginx configuration..."
nginx -p /home/harvey/inter-geo -c "$CONF_PATH" -s reload
echo "✅ Nginx reloaded successfully."
