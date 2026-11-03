#!/usr/bin/env bash
set -e

CONF_PATH="/home/harvey/inter-geo/nginx.conf"
PID_FILE="/tmp/inter_geo_nginx.pid"
SIZE_PID_FILE="/tmp/inter_geo_layer_size.pid"

if [ -f "$SIZE_PID_FILE" ] && kill -0 "$(cat "$SIZE_PID_FILE")" 2>/dev/null; then
    echo "Layer size writer already running (PID $(cat "$SIZE_PID_FILE"))."
else
    echo "Starting layer size writer on 127.0.0.1:8091..."
    setsid node /home/harvey/inter-geo/scripts/dev-layer-size-server.mjs \
        >/tmp/inter_geo_layer_size.log 2>&1 < /dev/null &
    echo $! > "$SIZE_PID_FILE"
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "⚠️  Nginx is already running (PID $(cat "$PID_FILE"))."
    echo "   URL: http://localhost:8080/inter-geo/"
    exit 0
fi

echo "🚀 Starting Nginx for Inter-Geo..."
nginx -p /home/harvey/inter-geo -c "$CONF_PATH"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✅ Nginx started successfully (PID $(cat "$PID_FILE"))!"
    echo "   🔗 Web App:   http://localhost:8080/inter-geo/"
    echo "   📁 Data Base: http://localhost:8080/inter-geo/@geo-data/"
else
    echo "❌ Failed to start Nginx. Check logs at /tmp/inter_geo_nginx_error.log"
    exit 1
fi
