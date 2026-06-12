#!/bin/sh
# Render nginx config from template using runtime environment variables.
#
# Why a template: the deployed backend URL and listen port are only known at
# runtime. Locally (docker-compose) the defaults below reproduce the original
# behavior exactly (listen 80, proxy to http://backend:8000). On Railway, PORT
# and BACKEND_URL are provided by the platform / service variables.
set -e

# Defaults preserve the local docker-compose behavior.
export PORT="${PORT:-80}"
export BACKEND_URL="${BACKEND_URL:-http://backend:8000}"

# Use the container's own DNS server (from /etc/resolv.conf) as the nginx
# resolver so /api and /ws upstreams are resolved at request time. This is
# 127.0.0.11 under docker-compose and Railway's internal DNS in the cloud.
# Wrap IPv6 resolver addresses in [] as nginx requires.
NGINX_RESOLVER="$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null)"
NGINX_RESOLVER="${NGINX_RESOLVER:-127.0.0.11}"
case "$NGINX_RESOLVER" in
  *:*) NGINX_RESOLVER="[$NGINX_RESOLVER]" ;;
esac
export NGINX_RESOLVER

# Only substitute our own variables so nginx's $host/$uri/$remote_addr etc. and
# the $cityshield_backend variable are left untouched.
envsubst '${PORT} ${BACKEND_URL} ${NGINX_RESOLVER}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx listening on ${PORT}, proxying /api and /ws to ${BACKEND_URL} (resolver ${NGINX_RESOLVER})"

exec nginx -g 'daemon off;'
