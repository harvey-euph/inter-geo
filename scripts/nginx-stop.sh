#!/usr/bin/env bash
set -e

CONF_PATH="/home/harvey/inter-geo/nginx.conf"
PID_FILE="/tmp/inter_geo_nginx.pid"

if [ ! -f "$PID_FILE" ] || ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "ℹ️  Nginx is not running."
    rm -f "$PID_FILE"
    exit 0
fi

echo "🛑 Stopping Nginx..."
nginx -p /home/harvey/inter-geo -c "$CONF_PATH" -s stop 2>/dev/null || kill "$(cat "$PID_FILE")" 2>/dev/null || true
rm -f "$PID_FILE"
echo "✅ Nginx stopped."
