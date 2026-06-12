#!/bin/sh
# Start the CityShield API. Used by BOTH local docker-compose and Railway, so
# there is no startCommand in railway.json (which would run in exec form and not
# expand $PORT). This script runs via the Dockerfile CMD's shell and expands
# variables correctly.
#
# Host binding:
#   - Local (PORT unset)  -> 0.0.0.0  : IPv4, works with docker-compose port mapping.
#   - Railway (PORT set)  -> ::       : IPv6 dual-stack, required by Railway's
#       private network so the frontend can reach the backend, and accepted by
#       Railway's healthcheck.
#   - UVICORN_HOST overrides either default.
set -e

HOST="${UVICORN_HOST:-0.0.0.0}"
if [ -z "${UVICORN_HOST:-}" ] && [ -n "${PORT:-}" ]; then
  HOST="::"
fi

echo "[start] binding uvicorn to ${HOST}:${PORT:-8000}"
exec uvicorn app.main:app --host "$HOST" --port "${PORT:-8000}"
