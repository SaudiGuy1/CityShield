#!/usr/bin/env bash
# CityShield — one-shot VPS deploy (Ubuntu/Debian).
#
# Run from the repo root on a fresh server:
#   sudo bash deploy/vps-deploy.sh
#
# It installs Docker, applies the OpenSearch kernel setting, generates a strong
# JWT secret, and starts the core stack with only the frontend exposed (port 80).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# Core services only — the heavy cyber range (Metasploitable/attacker/loggers)
# is intentionally left out; it is x86-only and not needed for the demo.
CORE_SERVICES="opensearch backend frontend traffic_sim iot_sim network_emulator detection_engine response_manager scenario_runner"

echo "==> CityShield VPS deploy starting in ${REPO_DIR}"

# 1) Docker + compose plugin
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose plugin not available. Install Docker Engine 24+." >&2
  exit 1
fi

# 2) OpenSearch needs vm.max_map_count >= 262144 on Linux
echo "==> Setting vm.max_map_count=262144"
sysctl -w vm.max_map_count=262144 >/dev/null
if ! grep -q "vm.max_map_count" /etc/sysctl.conf 2>/dev/null; then
  echo "vm.max_map_count=262144" >> /etc/sysctl.conf
fi

# 3) Environment file
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi
# Replace the placeholder JWT secret with a strong random one (only if unchanged)
if grep -qiE "^BACKEND_JWT_SECRET=(change-this|CHANGE_ME)" .env; then
  SECRET="$(openssl rand -hex 32)"
  sed -i "s|^BACKEND_JWT_SECRET=.*|BACKEND_JWT_SECRET=${SECRET}|" .env
  echo "==> Generated a strong BACKEND_JWT_SECRET"
fi

# 4) Build and start the core stack (frontend public on :80, rest internal)
echo "==> Building and starting core services (first run takes a few minutes)..."
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build ${CORE_SERVICES}

# 5) Report the public URL
IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
ADMIN_PASS="$(grep -E '^DEFAULT_ADMIN_PASS=' .env | cut -d= -f2-)"
echo
echo "============================================================"
echo "  CityShield is starting up."
echo "  URL:      http://${IP}/"
echo "  Login:    admin / ${ADMIN_PASS:-<see DEFAULT_ADMIN_PASS in .env>}"
echo
echo "  First boot needs ~1-2 min (OpenSearch + backend seeding)."
echo "  Watch progress:  docker compose logs -f backend"
echo "  IMPORTANT: open ports 22 and 80 in your cloud firewall,"
echo "             and change the default admin password after login."
echo "============================================================"
