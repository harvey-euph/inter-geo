#!/usr/bin/env bash
set -e

CONF_PATH="/home/harvey/inter-geo/nginx.conf"
PID_FILE="/tmp/inter_geo_nginx.pid"

if [ ! -f "$PID_FILE" ] || ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "⚠️  Nginx is not running. Starting instead..."
    /home/harvey/inter-geo/scripts/nginx-start.sh
    exit 0
fi

echo "🔄 Reloading Nginx configuration..."
nginx -p /home/harvey/inter-geo -c "$CONF_PATH" -s reload
echo "✅ Nginx reloaded successfully."
