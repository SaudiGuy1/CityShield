# CityShield — Setup Guide (macOS & Windows)

This guide takes a brand‑new developer from a clean machine to a running CityShield instance. It is
written specifically for this repository — the commands match the actual `docker-compose.yml`,
`package.json`, and backend `requirements.txt`.

There are two ways to run CityShield:

- **Docker (recommended)** — one command brings up the whole platform. This is the supported path.
- **Manual (advanced)** — run the frontend and backend directly for development. You still need
  OpenSearch running (easiest via Docker).

> The platform is built and tested with **Python 3.11** (containers) and **Node 18+** (frontend).

---

## Table of Contents

1. [Hardware Requirements](#hardware-requirements)
2. [macOS Setup](#macos-setup)
3. [Windows Setup](#windows-setup)
4. [Configuring `.env`](#configuring-env)
5. [Running with Docker (both OSes)](#running-with-docker-both-oses)
6. [Running Frontend / Backend Manually (advanced)](#running-frontend--backend-manually-advanced)
7. [Verifying the System](#verifying-the-system)
8. [Default Login Accounts](#default-login-accounts)
9. [Common Problems & Fixes](#common-problems--fixes)
10. [Stop / Reset / Rebuild](#stop--reset--rebuild)

---

## Hardware Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | **16 GB** (OpenSearch alone reserves ~1 GB heap; Docker Desktop should get ≥6 GB) |
| Free disk | 20 GB | 30 GB+ (images: OpenSearch, Kali, Metasploitable, Node/Python builds) |
| CPU | 4 cores (x86‑64 or Apple Silicon) | 6+ cores |

> Apple Silicon (M‑series) works. Some range images (e.g. Metasploitable 2) are amd64‑only and run
> under emulation — that is fine for the core platform; if you only need the application path you can
> skip those services (see [Running with Docker](#running-with-docker-both-oses)).

---

## macOS Setup

### 1. Install required software

| Tool | Why | How |
|---|---|---|
| **Docker Desktop** | Runs the whole stack. | https://www.docker.com/products/docker-desktop/ — or `brew install --cask docker` |
| **Git** | Clone the repo. | Comes with Xcode CLT: `xcode-select --install`, or `brew install git` |
| **Node.js 18+ & npm** | Frontend build / manual dev. | https://nodejs.org (LTS) — or `brew install node` |
| **Python 3.11** | Manual backend dev / scripts. | `brew install python@3.11` |
| **VS Code** (recommended) | Editor. | https://code.visualstudio.com — or `brew install --cask visual-studio-code` |
| **Homebrew** (optional) | Package manager used above. | https://brew.sh |

> If you only run via Docker, you only strictly need **Docker Desktop** and **Git**.

### 2. Start Docker Desktop

Launch Docker Desktop and wait for the whale icon to show "running". Verify:

```bash
docker --version
docker compose version
docker info        # should not error
```

### 3. Clone and configure

```bash
git clone <repository-url> CityShield
cd CityShield
cp .env.example .env
```

Now edit `.env` — see [Configuring `.env`](#configuring-env) — then jump to
[Running with Docker](#running-with-docker-both-oses).

---

## Windows Setup

CityShield runs on Windows via **Docker Desktop with the WSL2 backend**.

### 1. Enable WSL2

Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

Reboot when prompted. This installs WSL2 and a default Ubuntu distribution. Verify:

```powershell
wsl --status      # "Default Version: 2"
wsl --list --verbose
```

### 2. Install required software

| Tool | Why | How |
|---|---|---|
| **Docker Desktop** (WSL2 backend) | Runs the whole stack. | https://www.docker.com/products/docker-desktop/ — during install keep "Use WSL 2 based engine" checked |
| **Git** | Clone the repo. | https://git-scm.com/download/win — or `winget install Git.Git` |
| **Node.js 18+ & npm** | Frontend build / manual dev. | https://nodejs.org (LTS) — or `winget install OpenJS.NodeJS.LTS` |
| **Python 3.11** | Manual backend dev / scripts. | https://www.python.org/downloads/ — or `winget install Python.Python.3.11` (tick "Add to PATH") |
| **VS Code** (recommended) | Editor; install the "WSL" extension. | https://code.visualstudio.com — or `winget install Microsoft.VisualStudioCode` |

In Docker Desktop → **Settings → Resources → WSL Integration**, enable your Ubuntu distro.

### 3. Clone and configure

Use a **WSL/Ubuntu** terminal (recommended for performance) or Git Bash / PowerShell:

```bash
git clone <repository-url> CityShield
cd CityShield
cp .env.example .env        # PowerShell: copy .env.example .env
```

> **Tip:** clone inside the WSL filesystem (e.g. `~/CityShield`), not under `/mnt/c/...`, for much
> faster Docker file I/O.

Edit `.env` (see below), then jump to [Running with Docker](#running-with-docker-both-oses).

---

## Configuring `.env`

`cp .env.example .env` gives you working defaults for local use. **Before anything beyond local
testing, change at least these:**

```bash
BACKEND_JWT_SECRET=<a long random string, ≥32 chars>
DEFAULT_ADMIN_PASS=<your admin password>
OPENSEARCH_PASS=<your opensearch password>
```

Generate a strong secret:

```bash
# macOS / Linux / WSL
openssl rand -base64 48
```

Other useful keys (full list in [README.md](README.md#environment-variables)):

- `CORS_ALLOWED_ORIGINS` — browser origins allowed to call the API (default `http://localhost:3000`).
- `RESPONSE_ENABLED` — set `false` to disable automated playbook execution.
- `THREAT_INTEL_PROVIDER` — `mock` (default) or `abuseipdb` (then set `ABUSEIPDB_API_KEY`).

`.env` is git‑ignored and will not be committed.

---

## Running with Docker (both OSes)

From the repository root:

```bash
docker compose up --build          # build images and start the FULL platform (first run is slow)
```

First build downloads several GB and can take 20–40 minutes depending on network/CPU. Subsequent
starts are fast. To run detached:

```bash
docker compose up -d --build
```

### Core‑only (skip the heavy Kali / Metasploitable cyber range)

If you don't need the live attack range (or you're on a constrained machine), start just the
application path:

```bash
docker compose up -d \
  opensearch backend frontend \
  traffic_sim iot_sim network_emulator \
  detection_engine response_manager scenario_runner dashboards
```

This is enough to log in, see the 3D city, generate telemetry, fire detections, and run responses.

---

## Running Frontend / Backend Manually (advanced)

You still need OpenSearch — the simplest way is to start it via Docker:

```bash
docker compose up -d opensearch
```

### Backend (FastAPI)

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate           # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# point the backend at the local OpenSearch and set required env vars
export OPENSEARCH_URL=http://localhost:9200
export OPENSEARCH_USER=admin
export OPENSEARCH_PASS=Admin@123!Change
export BACKEND_JWT_SECRET=local-dev-secret-change-me
export DEFAULT_ADMIN_USER=admin
export DEFAULT_ADMIN_PASS=CityShield@Admin2026

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend is now at http://localhost:8000 (Swagger at `/docs`).

### Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev          # dev server on http://localhost:3000, proxies /api and /ws to :8000
```

Other frontend scripts: `npm run build` (type‑check + production build), `npm run lint`,
`npm run preview`.

### Backend tests

```bash
cd backend
pip install -r requirements.txt
# tests require a reachable OpenSearch (the running container is fine)
OPENSEARCH_URL=http://localhost:9200 BACKEND_JWT_SECRET=test-secret pytest -q
```

---

## Verifying the System

```bash
docker compose ps          # every service should be "running"/"healthy"
```

Expected URLs once everything is up:

| Service | URL | Notes |
|---|---|---|
| Frontend (SOC console) | http://localhost:3000 | nginx in the container |
| Backend API | http://localhost:8000 | health: `GET /api/health` |
| Swagger / OpenAPI | http://localhost:8000/docs | |
| OpenSearch | http://localhost:9200 | `GET /_cluster/health` |
| OpenSearch Dashboards | http://localhost:5601 | first load can take ~1 min |
| Simulators (8001–8003) | _internal only_ | not published to the host |

Quick smoke test:

```bash
# backend health
curl http://localhost:8000/api/health

# log in and call a protected endpoint
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"CityShield@Admin2026"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/rules | head

# confirm simulators are ingesting telemetry
curl -s http://localhost:9200/logs-traffic/_count
```

A healthy system shows growing document counts in `logs-traffic`, `logs-iot`, and `logs-network`.

---

## Default Login Accounts

Created on first backend startup from `.env` (change after first login):

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `CityShield@Admin2026` |
| Researcher | `researcher` | `CityShield@Researcher2026` |

Additional users (Analyst, Manager, Viewer) are created via **Admin → Users** while logged in as the
administrator.

---

## Common Problems & Fixes

**Docker isn't running / "cannot connect to the Docker daemon"**
Start Docker Desktop and wait for it to report "running"; then retry. Verify with `docker info`.

**Port already in use (3000 / 8000 / 9200 / 5601)**
Another process holds the port. Find and stop it, or change the host port mapping in
`docker-compose.yml`.
- macOS/Linux/WSL: `lsof -i :8000` then `kill <PID>`
- Windows PowerShell: `netstat -ano | findstr :8000` then `taskkill /PID <PID> /F`

**OpenSearch exits / "max virtual memory areas vm.max_map_count too low" (Linux/WSL)**
Raise the limit on the Docker host:
```bash
sudo sysctl -w vm.max_map_count=262144     # run inside the WSL distro on Windows
```
Also give Docker Desktop more memory (Settings → Resources → Memory ≥ 6 GB). If OpenSearch is killed
(exit 137), it ran out of memory.

**OpenSearch cluster status is `yellow`**
This is normal for a single node (replica shards are unassigned). The platform works on `yellow`.

**Node / npm errors during `npm install` or `npm run build`**
Use Node 18+ (`node --version`). Clear and reinstall:
```bash
rm -rf node_modules package-lock.json && npm install
```

**Python dependency issues (manual backend)**
Use Python 3.11 in a virtual environment (don't install globally). Recreate the venv if pip resolves
the wrong versions. The repository pins all backend versions in `backend/requirements.txt`.

**Windows / WSL2 issues**
- Ensure WSL2 (not WSL1): `wsl --list --verbose`.
- Enable WSL integration for your distro in Docker Desktop settings.
- Clone the repo inside the WSL filesystem (`~/...`), not `/mnt/c/...`, to avoid slow I/O and
  permission quirks.
- Line endings: configure Git with `git config --global core.autocrlf input`.

**macOS permission issues**
If a script won't run: `chmod +x scripts/<name>.sh`. If macOS Gatekeeper blocks Docker Desktop, allow
it under **System Settings → Privacy & Security**.

**Backend healthy but the Alerts UI shows no response actions**
Ensure you're on the current `docker-compose.yml`: the backend mounts
`services/response_manager/playbooks_map.yml` so `/api/actions` can list the 12 playbooks. Recreate the
backend: `docker compose up -d --force-recreate backend`.

**A service stays "unhealthy"**
Check its logs: `docker compose logs --tail=50 <service>`. Most issues are OpenSearch not being ready
yet — give it up to a minute on first start.

---

## Stop / Reset / Rebuild

```bash
# stop everything (keeps data volumes)
docker compose down

# stop AND delete volumes (wipes OpenSearch data → full clean slate)
docker compose down -v

# rebuild images from scratch (after code or dependency changes)
docker compose build --no-cache
docker compose up -d --build

# rebuild a single service
docker compose up -d --build backend

# follow logs while debugging
docker compose logs -f
docker compose logs -f detection_engine

# confirm health of all services
docker compose ps
```

To completely reset: `docker compose down -v`, then `docker compose up --build`. This re‑seeds the
default users, detection rules, scenarios, and range assets on the next backend startup.
