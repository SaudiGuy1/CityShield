#!/bin/sh
# Render nginx config from template using runtime environment variables.
#
# Defaults reproduce the local docker-compose behavior exactly (listen 80, proxy
# to http://backend:8000). On Railway/Render, PORT and BACKEND_URL come from the
# platform / service variables.
set -e

# Defaults preserve the local docker-compose behavior.
export PORT="${PORT:-80}"
BACKEND_URL="${BACKEND_URL:-http://backend:8000}"

# Accept a bare host (e.g. Render's `fromService` gives just the hostname) and
# assume https for it. Full URLs (http://… / https://…) are used as-is.
case "$BACKEND_URL" in
  *://*) : ;;
  *) BACKEND_URL="https://$BACKEND_URL" ;;
esac
export BACKEND_URL

# Bare host[:port] for the upstream Host header and TLS SNI.
BACKEND_HOST="${BACKEND_URL#*://}"
BACKEND_HOST="${BACKEND_HOST%%/*}"
export BACKEND_HOST

# Use the container's own DNS server (from /etc/resolv.conf) as the nginx
# resolver so /api and /ws upstreams are resolved at request time.
NGINX_RESOLVER="$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null)"
NGINX_RESOLVER="${NGINX_RESOLVER:-127.0.0.11}"
case "$NGINX_RESOLVER" in
  *:*) NGINX_RESOLVER="[$NGINX_RESOLVER]" ;;
esac
export NGINX_RESOLVER

# Only substitute our own variables so nginx's $host/$uri/$remote_addr and the
# $cityshield_backend variable are left untouched.
envsubst '${PORT} ${BACKEND_URL} ${BACKEND_HOST} ${NGINX_RESOLVER}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx :${PORT} -> ${BACKEND_URL} (Host ${BACKEND_HOST}, resolver ${NGINX_RESOLVER})"

exec nginx -g 'daemon off;'
