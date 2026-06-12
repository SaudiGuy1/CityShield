# Deploying CityShield to Railway

This guide gets CityShield running online on [Railway](https://railway.app) for
demos, while keeping the local `docker-compose` workflow fully intact.

CityShield is a **multi-service** application. Railway deploys **one service per
process**, so you create several services in a single Railway *project*, all
pointing at this same repo but with different **Root Directories**.

> **TL;DR for the fastest demo:** deploy 3 services — `opensearch`, `backend`,
> `frontend` — plus the 3 simulators and `detection-engine` if you want live
> traffic and alerts. Everything else is optional or local-only.

---

## 1. What can run on Railway

| Component | Railway? | Root Directory | Public domain? | Notes |
|---|---|---|---|---|
| **frontend** (React + nginx) | ✅ Yes | `frontend` | ✅ **Yes** (users hit this) | Reverse-proxies `/api` + `/ws` to the backend |
| **backend** (FastAPI) | ✅ Yes | `backend` | Optional | Binds `::` for private networking; `/docs` if public |
| **opensearch** | ⚠️ Yes, with caveats | `infrastructure/railway/opensearch` | ❌ **No — keep private** | Memory-heavy; see [Known limitations](#7-known-limitations) |
| **traffic-sim** | ✅ Yes | `services/simulators/traffic_sim` | ❌ No | Generates live traffic events |
| **iot-sim** | ✅ Yes | `services/simulators/iot_sim` | ❌ No | Generates live IoT events |
| **network-emulator** | ✅ Yes | `services/simulators/network_emulator` | ❌ No | Generates network/attack events |
| **detection-engine** | ✅ Yes | `services/detection_engine` | ❌ No | Polls OpenSearch, writes alerts |
| **response-manager** | ⚠️ Partial | `services/response_manager` | ❌ No | Run with `RESPONSE_ENABLED=false` (no Ansible/Docker on Railway) |
| **scenario-runner** | ✅ Yes | `services/scenario_runner` | ❌ No | Drives the simulators for attack scenarios |
| **dashboards** (OpenSearch Dashboards) | ⛔ Skip | — | — | Heavy and optional; not needed for the app UI |
| **filebeat** | ⛔ No | — | — | Needs the host Docker socket / container logs |
| **metasploitable** | ⛔ No (local-only) | — | — | Vulnerable VM; cyber-range only |
| **attacker** | ⛔ No (local-only) | — | — | Needs `NET_RAW`/`NET_ADMIN` |
| **range_logger / iot_range_logger** | ⛔ No (local-only) | — | — | Packet capture, raw sockets |
| **iot_target** | ⛔ No (local-only) | — | — | Cyber-range target |
| **researcher-lab** | ⛔ No (local-only) | — | — | Spawns per-user Docker containers via the Docker socket |

**Why the local-only ones can't run on Railway:** Railway gives each service an
isolated container with **no Docker socket, no raw-socket/`NET_ADMIN`
capabilities, and no custom bridge networks**. The cyber-range (Kali-style
attacker, Metasploitable, packet-capture loggers) and the per-researcher lab all
depend on exactly those. They stay in `docker-compose.yml` for local use. The
backend calls into them defensively (try/except), so on Railway those specific
features simply return "unavailable" instead of crashing the app.

---

## 2. Service architecture on Railway

```
                       Internet
                          │
                          ▼
                 ┌──────────────────┐
   users ───────▶│  frontend (nginx)│  public domain (HTTPS)
                 │  serves SPA      │
                 │  proxies /api,/ws│
                 └────────┬─────────┘
                          │ private network (BACKEND_URL)
                          ▼
                 ┌──────────────────┐        ┌────────────────────────┐
                 │  backend (FastAPI)│◀──────▶│ detection-engine        │
                 │  binds ::         │        │ response-manager        │
                 └────────┬─────────┘        │ scenario-runner         │
                          │ private          │ traffic/iot/network sims │
                          ▼                  └───────────┬─────────────┘
                 ┌──────────────────┐                    │ private
                 │  opensearch       │◀───────────────────┘
                 │  PRIVATE ONLY     │
                 └──────────────────┘
```

- Only **frontend** (and optionally **backend**) get a public domain.
- **OpenSearch is never public.** Its protection is that it lives only on
  Railway's private network. Do **not** click "Generate Domain" on it.
- Services talk to each other using Railway **private domains**
  (`<service>.railway.internal`) referenced via `${{service.VAR}}` variables.

---

## 3. Before you start

Generate a strong JWT secret (you'll paste it into the backend):

```bash
openssl rand -hex 32
```

Decide on admin/researcher passwords (don't keep the defaults).

You'll need:
- A Railway account + a new **empty project**.
- This repo pushed to GitHub (Railway deploys from GitHub), **or** the Railway
  CLI (`npm i -g @railway/cli`) for `railway up`.

---

## 4. Step-by-step (Railway dashboard)

Create services **in this order** so each one's variables can reference the
previous ones. For every service: **New → Deploy from GitHub repo → select this
repo**, then open the service's **Settings → Root Directory** and set it to the
path in the table above. Railway auto-detects the `railway.json` + `Dockerfile`
there.

### 4.1 OpenSearch (create first)
1. **New → GitHub repo → this repo.** Rename the service to **`opensearch`**.
2. **Settings → Root Directory** = `infrastructure/railway/opensearch`.
3. **Settings → Networking:** add a **Volume** mounted at
   `/usr/share/opensearch/data` (so data survives restarts). *Do not* generate a
   public domain.
4. Deploy. Give it a minute — OpenSearch is slow to boot. Logs should end with
   `"started"`.

### 4.2 Backend
1. **New → GitHub repo → this repo.** Rename to **`backend`**.
2. **Root Directory** = `backend`.
3. **Variables** (Raw Editor) — paste the backend block from
   `.env.railway.example`, then set real values:
   ```
   OPENSEARCH_URL=http://${{opensearch.RAILWAY_PRIVATE_DOMAIN}}:9200
   OPENSEARCH_USER=admin
   OPENSEARCH_PASS=admin
   BACKEND_JWT_SECRET=<paste: openssl rand -hex 32>
   BACKEND_JWT_ALGORITHM=HS256
   BACKEND_ACCESS_TOKEN_EXPIRE_MINUTES=60
   CORS_ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
   DEFAULT_ADMIN_USER=admin
   DEFAULT_ADMIN_PASS=<your-strong-password>
   DEFAULT_ADMIN_EMAIL=admin@cityshield.example.com
   DEFAULT_RESEARCHER_USER=researcher
   DEFAULT_RESEARCHER_PASS=<your-strong-password>
   DEFAULT_RESEARCHER_EMAIL=researcher@cityshield.example.com
   USE_MOCK_CITY_COMPONENTS=true
   LOG_LEVEL=INFO
   ```
4. Deploy. The healthcheck hits `/api/health`. First boot waits for OpenSearch
   (built-in retry), so it may take a minute.
5. *(Optional)* **Settings → Networking → Generate Domain** if you want to reach
   `/docs` directly. Not required for the app.

### 4.3 Frontend
1. **New → GitHub repo → this repo.** Rename to **`frontend`**.
2. **Root Directory** = `frontend`.
3. **Variables:**
   ```
   BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
   ```
4. **Settings → Networking → Generate Domain.** This is the URL you give people.
5. Deploy, then open the generated URL and log in.

> **Login already works at this point** (auth, dashboards, RBAC, awareness,
> scenarios). The services below add *live data*.

### 4.4 Simulators (live data) — repeat for each
| Service name | Root Directory | Extra variable |
|---|---|---|
| `traffic-sim` | `services/simulators/traffic_sim` | `TRAFFIC_SIM_EVENT_RATE=2` |
| `iot-sim` | `services/simulators/iot_sim` | `IOT_SIM_EVENT_RATE=3` |
| `network-emulator` | `services/simulators/network_emulator` | `NETWORK_EMULATOR_EVENT_RATE=1` |

Common variable for all three:
```
OPENSEARCH_URL=http://${{opensearch.RAILWAY_PRIVATE_DOMAIN}}:9200
LOG_LEVEL=INFO
```
No public domain. They write events straight to OpenSearch.

### 4.5 Detection engine (alerts)
- Service name `detection-engine`, Root Directory `services/detection_engine`.
- Variables:
  ```
  OPENSEARCH_URL=http://${{opensearch.RAILWAY_PRIVATE_DOMAIN}}:9200
  OPENSEARCH_USER=admin
  OPENSEARCH_PASS=admin
  THREAT_INTEL_PROVIDER=mock
  DETECTION_POLL_INTERVAL_SECONDS=30
  LOG_LEVEL=INFO
  ```

### 4.6 Scenario runner (optional — drives attack scenarios)
- Service name `scenario-runner`, Root Directory `services/scenario_runner`.
- Variables:
  ```
  OPENSEARCH_URL=http://${{opensearch.RAILWAY_PRIVATE_DOMAIN}}:9200
  OPENSEARCH_USER=admin
  OPENSEARCH_PASS=admin
  SCENARIO_POLL_INTERVAL_SECONDS=5
  TRAFFIC_SIM_URL=http://${{traffic-sim.RAILWAY_PRIVATE_DOMAIN}}:8001
  IOT_SIM_URL=http://${{iot-sim.RAILWAY_PRIVATE_DOMAIN}}:8002
  NETWORK_EMULATOR_URL=http://${{network-emulator.RAILWAY_PRIVATE_DOMAIN}}:8003
  LOG_LEVEL=INFO
  ```

### 4.7 Response manager (optional — degraded on Railway)
- Service name `response-manager`, Root Directory `services/response_manager`.
- Variables:
  ```
  OPENSEARCH_URL=http://${{opensearch.RAILWAY_PRIVATE_DOMAIN}}:9200
  OPENSEARCH_USER=admin
  OPENSEARCH_PASS=admin
  RESPONSE_ENABLED=false
  LOG_LEVEL=INFO
  ```
  `RESPONSE_ENABLED=false` because the Ansible/Docker-socket active-response
  actions can't run on Railway. It will still record intended responses.

---

## 5. Deploying with the Railway CLI (alternative)

The dashboard is easiest for a multi-service repo, but you can also:

```bash
npm i -g @railway/cli
railway login
railway link            # pick your project
# In each service's root dir, after creating the service + setting its root dir:
railway up
```

Per-service `railway.json` files in this repo set the builder, start command,
healthcheck, and restart policy automatically.

---

## 6. Verify it's working

1. **OpenSearch** logs show `started`; no public domain.
2. **Backend** healthcheck green. Visit `https://<backend>/api/health` (if you
   exposed it) → `{"status":"ok"...}`.
3. **Frontend** URL loads the login page.
4. Log in with your `DEFAULT_ADMIN_USER` / `DEFAULT_ADMIN_PASS`.
5. With simulators + detection-engine running, the Overview/SmartCity dashboards
   show live events and alerts within a minute or two.

**Change the default admin password after first login.**

---

## 7. Known limitations on Railway

- **OpenSearch is the main risk.** It wants ~1–2 GB RAM. The Railway wrapper
  image caps the heap at 512 MB (`OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m`) and
  disables `mmap`/`memlock` so it can boot on a constrained container. If it
  OOMs or restart-loops:
  - Bump the heap (e.g. `-Xms1g -Xmx1g`) and the plan's memory, **or**
  - Use a **managed OpenSearch/Elasticsearch** (e.g. Bonsai) and point
    `OPENSEARCH_URL` at its `https://` URL with real `OPENSEARCH_USER/PASS` —
    the backend auto-enables TLS when the URL starts with `https`.
- **Private networking is IPv6.** That's why backend/sims bind `::`. If a
  service can't reach OpenSearch, confirm it's listening on `::`, not just
  `0.0.0.0`.
- **No Docker socket / raw sockets.** The live cyber-range (Kali/attacker,
  Metasploitable, packet loggers), the IoT range, and the per-researcher lab
  terminal are **local-only**. Those UI features will show as unavailable.
- **Active response is disabled** (`RESPONSE_ENABLED=false`) — Ansible playbooks
  need targets that only exist in the local range.
- **No shared volume for logs.** The local `logs_volume` (filebeat tailing
  simulator JSONL files) isn't replicated; on Railway the simulators write
  events directly to OpenSearch, which is what the dashboards read anyway.
- **Free/trial plans sleep / have limited hours.** For a persistent demo use a
  paid plan, at least for `opensearch` and `backend`.

---

## 8. Security checklist

- ✅ No secrets in the repo — `.env` is git-ignored; only `.env.example` /
  `.env.railway.example` (placeholders) are committed.
- ✅ `BACKEND_JWT_SECRET` generated with `openssl rand -hex 32`, set only as a
  Railway variable.
- ✅ OpenSearch has **no public domain** — reachable only on the private network.
- ✅ Default admin/researcher passwords overridden via variables; change again
  after first login.
- ✅ `CORS_ALLOWED_ORIGINS` pinned to the frontend domain (no wildcard).
- ⚠️ If you expose OpenSearch publicly for any reason, you **must** enable the
  security plugin and set real credentials first.

---

## 9. Quick reference — services to create

| # | Railway service name | Root Directory | Domain | Required for demo |
|---|---|---|---|---|
| 1 | `opensearch` | `infrastructure/railway/opensearch` | private | ✅ |
| 2 | `backend` | `backend` | optional | ✅ |
| 3 | `frontend` | `frontend` | **public** | ✅ |
| 4 | `traffic-sim` | `services/simulators/traffic_sim` | private | live data |
| 5 | `iot-sim` | `services/simulators/iot_sim` | private | live data |
| 6 | `network-emulator` | `services/simulators/network_emulator` | private | live data |
| 7 | `detection-engine` | `services/detection_engine` | private | alerts |
| 8 | `scenario-runner` | `services/scenario_runner` | private | optional |
| 9 | `response-manager` | `services/response_manager` | private | optional |

Minimum for a working login + dashboards: **1, 2, 3**.
Add **4–7** for live events and alerts.
