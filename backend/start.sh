#!/bin/sh
# Start the CityShield API. Used by BOTH local docker-compose and Railway, so
# there is no startCommand in railway.json (which would run in exec form and not
# expand $PORT). This script runs via the Dockerfile CMD's shell.
#
# Host binding:
#   - Local   -> 0.0.0.0 : IPv4, works with docker-compose port mapping.
#   - Railway -> ::      : IPv6 dual-stack, REQUIRED so Railway's private network
#                          (frontend -> backend, backend -> opensearch is outbound
#                          and unaffected) can reach this service, and accepted by
#                          Railway's healthcheck.
#
# Railway is detected via the RAILWAY_* variables it always injects, so the bind
# is correct whether or not the service has a public domain or a PORT set.
# UVICORN_HOST overrides the detection.
set -e

PORT="${PORT:-8000}"

if [ -n "${UVICORN_HOST:-}" ]; then
  HOST="$UVICORN_HOST"
elif [ -n "${RAILWAY_PRIVATE_DOMAIN:-}" ] || [ -n "${RAILWAY_ENVIRONMENT_NAME:-}" ] || [ -n "${RAILWAY_SERVICE_NAME:-}" ] || [ -n "${RAILWAY_PROJECT_ID:-}" ]; then
  HOST="::"
else
  HOST="0.0.0.0"
fi

echo "[start] binding uvicorn to ${HOST}:${PORT}"
exec uvicorn app.main:app --host "$HOST" --port "$PORT"
