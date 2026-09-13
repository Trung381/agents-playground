#!/bin/sh
set -e

# Default credentials from .env.local
USER="${VOXA_API_USERNAME:-trungvu}"
PASS="${VOXA_API_PASSWORD:-Trung2004@}"

echo "[auth-proxy] Configuring HTTP Basic Auth for user: ${USER}"
htpasswd -b -c /etc/nginx/.htpasswd "${USER}" "${PASS}"
chmod 644 /etc/nginx/.htpasswd

echo "[auth-proxy] Starting Nginx..."
exec nginx -g "daemon off;"
