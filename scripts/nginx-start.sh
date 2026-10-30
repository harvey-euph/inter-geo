#!/usr/bin/env bash
set -e

CONF_PATH="/home/harvey/inter-geo/nginx.conf"
PID_FILE="/tmp/inter_geo_nginx.pid"

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
