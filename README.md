# CityShield

> A smart‑city cyber range for training, testing, and evaluating cybersecurity defenses.

CityShield is a self‑contained, containerized platform that simulates the digital infrastructure of a
smart city, generates realistic attack scenarios against it, detects threats with MITRE ATT&CK‑aligned
detection rules, and executes automated response playbooks. It is built as a teaching and research
environment: every layer — from the 3D city visualization down to the packet‑capturing cyber range —
runs locally on Docker Compose.

---

## Overview

CityShield models a city as a collection of monitored assets (traffic signals, IoT sensor hubs,
network segments) and runs a full **detect → respond → review** security workflow on top of them:

1. **Simulators** continuously generate realistic traffic, IoT, and network telemetry.
2. The **detection engine** evaluates 75+ YAML detection rules against that telemetry and raises alerts.
3. The **response manager** validates auto‑response conditions and executes Ansible playbooks.
4. Analysts triage and resolve alerts through a React SOC console, with a live **3D digital twin** of the city.
5. Researchers design attack scenarios, tune detection rules, and work in an isolated **research lab**.
6. Managers track team **security‑awareness** progress; the whole UI is bilingual (English / Arabic).

OpenSearch is the single source of truth — there is no relational database.

---

## Features

| Feature | Description |
|---|---|
| **Smart City Digital Twin** | Interactive 3D city (React Three Fiber) where buildings represent assets; color/height reflect status and event volume. |
| **Attack Simulation** | Built‑in and custom attack scenarios driven against the simulators and the live cyber range. |
| **Detection Engine** | 75+ YAML detection rules covering 25+ match‑logic types (scan, brute force, C2 beacon, exfiltration, DDoS, ransomware, lateral movement, etc.). |
| **MITRE ATT&CK Mapping** | Curated knowledge base of MITRE techniques; every rule and alert is mapped to a technique. |
| **Automated Response** | 12 Ansible response playbooks (block IP, isolate service, quarantine host, revoke token, …) with per‑rule conditions, rate limits, and whitelists. |
| **SOC Workflow** | Alert triage, manual response actions, execution history, and full audit logging. |
| **Alert Resolution** | Structured resolution workflow with disposition, notes, and resolution analytics. |
| **Research Lab** | Per‑user Ubuntu container (nmap, hydra, nikto, tcpdump, …) connected to all ranges, provisioned from the UI. |
| **Security Awareness** | Bilingual training content with per‑user and per‑team progress tracking. |
| **Team Analytics** | Manager dashboard over direct reports’ awareness progress. |
| **RBAC** | Five roles — Administrator, Analyst, Researcher, Manager, Viewer. |
| **Internationalization** | Full English/Arabic UI with right‑to‑left (RTL) layout support. |
| **Dark / Light Themes** | Theme toggle persisted per browser, with a WCAG‑aware light palette. |

---

## Architecture

Microservices orchestrated by Docker Compose across three networks:

- `cityshield_network` (bridge) — all application services.
- `cyber_range_net` (internal) — Metasploitable target + Kali attacker + packet logger.
- `iot_range_net` (internal) — IoT target + packet logger.

```
                         ┌──────────────┐        ┌──────────────────┐
        Browser ───────► │  Frontend    │ ─────► │  Backend API     │
        :3000            │  React/nginx │ /api   │  FastAPI :8000    │
                         └──────────────┘ /ws    └────────┬─────────┘
                                                          │
                              ┌───────────────────────────┼──────────────────────────┐
                              ▼                            ▼                          ▼
                       ┌────────────┐             ┌─────────────────┐        ┌────────────────┐
                       │ OpenSearch │ ◄────────── │ Detection Engine│        │ Response Mgr   │
                       │   :9200    │             │ (rules → alerts)│        │ (Ansible)      │
                       └─────┬──────┘             └─────────────────┘        └────────────────┘
                             ▲
              ┌──────────────┼───────────────┬──────────────────┐
              │              │               │                  │
        ┌───────────┐ ┌───────────┐ ┌──────────────┐  ┌─────────────────┐
        │ traffic_  │ │  iot_sim  │ │  network_    │  │ scenario_runner │
        │   sim     │ │           │ │  emulator    │  │                 │
        └───────────┘ └───────────┘ └──────────────┘  └─────────────────┘
              └──── logs‑* indices ◄─ Filebeat ◄─ Cyber range / IoT range loggers
```

**Data flow:** simulators → `logs-*` indices → detection engine → `alerts` → response manager →
Ansible playbooks → `action-audit-log`; the frontend reads via REST `/api/*` and a WebSocket
`/ws/city-telemetry`.

See [`docs/architecture.md`](docs/architecture.md) for the full design.

---

## Technology Stack

**Frontend** — React 18, TypeScript 5, Vite 5, React Three Fiber / drei / postprocessing (3D),
Recharts, Framer Motion, xterm.js (lab terminal), axios. Served by nginx in production.

**Backend** — FastAPI 0.109, Pydantic v2, python‑jose (JWT, HS256), bcrypt, opensearch‑py, PyYAML,
Docker SDK (research‑lab provisioning). Python 3.11.

**Data store** — OpenSearch 2.11 (single node) + OpenSearch Dashboards.

**Microservices (Python 3.11)** — detection_engine, response_manager, scenario_runner, and three
simulators (traffic_sim, iot_sim, network_emulator).

**Cyber range** — Metasploitable 2 (target), Kali (attacker), tcpdump packet loggers; IoT range with a
FastAPI IoT target.

**Infrastructure** — Docker Compose, Filebeat (log shipping), Ansible (12 response playbooks).

---

## User Roles

| Role | Capabilities | Default landing |
|---|---|---|
| **Administrator** | Full access, including user management. | Overview |
| **Analyst** | Triage/analyze alerts, execute manual response actions, resolution analytics. | Overview |
| **Researcher** | Design scenarios, manage detection rules, configure auto‑response, use the research lab. | Overview |
| **Manager** | View direct reports’ awareness progress (Team Analytics). | Team Analytics |
| **Viewer** | Read‑only access to security‑awareness content. | Awareness |

RBAC is enforced in the backend (`app/core/rbac.py`) and mirrored by route guards in the frontend.

---

## Installation

> **Full, OS‑specific instructions (macOS & Windows) are in [SETUP_GUIDE.md](SETUP_GUIDE.md).**
> The steps below are the quick path for an existing Docker environment.

**Prerequisites:** Docker Desktop 4.x+ (Compose 2.x+), 16 GB RAM recommended, ~20 GB free disk.

```bash
git clone <repository-url> CityShield
cd CityShield
cp .env.example .env          # then edit secrets — see Environment Variables below
docker compose up --build     # build and start the full platform
```

Then open:

| Service | URL |
|---|---|
| Frontend (SOC console) | http://localhost:3000 |
| Backend API + Swagger | http://localhost:8000/docs |
| OpenSearch | http://localhost:9200 |
| OpenSearch Dashboards | http://localhost:5601 |

The simulators (8001–8003) run **internally only** and are not published to the host.

**Default accounts** (defined in `.env`, change after first login):

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `CityShield@Admin2026` |
| Researcher | `researcher` | `CityShield@Researcher2026` |

---

## Docker Deployment

```bash
docker compose up --build         # build images and start everything
docker compose up -d              # start in the background
docker compose ps                 # service + health status
docker compose logs -f backend    # follow a service’s logs
docker compose down               # stop all services
docker compose down -v            # stop and wipe volumes (full reset)
```

Bring up only the core application path (skip the heavyweight Kali / Metasploitable cyber range):

```bash
docker compose up -d opensearch backend frontend \
  traffic_sim iot_sim network_emulator \
  detection_engine response_manager scenario_runner dashboards
```

Linux hosts must raise the OpenSearch mmap limit first: `sudo sysctl -w vm.max_map_count=262144`.

---

## Cloud Deployment (Railway)

CityShield can be published online for demos on [Railway](https://railway.app)
**without affecting the local `docker-compose` workflow** — the same Dockerfiles
are reused, with per-service `railway.json` files and a runtime-templated nginx
config selecting cloud behavior.

- **Cloud-ready:** frontend, backend, OpenSearch, the three simulators,
  detection engine, scenario runner (and a degraded response manager).
- **Local-only (excluded on Railway):** the cyber range (Kali-style attacker,
  Metasploitable, packet-capture loggers), the IoT range, and the
  per-researcher Docker lab — they need a Docker socket / raw sockets Railway
  doesn't provide.

Fastest demo = three services: `opensearch` (private) + `backend` + `frontend`
(public). Add the simulators + detection engine for live events and alerts.

👉 **Full step-by-step guide:** [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md)
(services to create, env vars, what to click, and known limitations).
Env var template: [`.env.railway.example`](./.env.railway.example).

---

## Environment Variables

Copy `.env.example` to `.env` and adjust. Key variables:

| Variable | Purpose | Default |
|---|---|---|
| `OPENSEARCH_URL` / `OPENSEARCH_USER` / `OPENSEARCH_PASS` | Data store connection. | `http://opensearch:9200` / `admin` / … |
| `BACKEND_JWT_SECRET` | **Change this.** Signing secret for JWTs (use ≥32 random chars). | placeholder |
| `BACKEND_ACCESS_TOKEN_EXPIRE_MINUTES` | Access‑token lifetime. | `60` |
| `CORS_ALLOWED_ORIGINS` | Comma‑separated browser origins allowed to call the API. | `http://localhost:3000,http://127.0.0.1:3000` |
| `DEFAULT_ADMIN_USER` / `DEFAULT_ADMIN_PASS` / `DEFAULT_ADMIN_EMAIL` | Seeded admin account. | `admin` / `CityShield@Admin2026` / … |
| `DEFAULT_RESEARCHER_USER` / `DEFAULT_RESEARCHER_PASS` / `DEFAULT_RESEARCHER_EMAIL` | Seeded researcher account. | `researcher` / … |
| `THREAT_INTEL_PROVIDER` / `ABUSEIPDB_API_KEY` | Alert enrichment (`mock` or `abuseipdb`). | `mock` |
| `DETECTION_POLL_INTERVAL_SECONDS` / `DETECTION_QUERY_WINDOW_SECONDS` | Detection cadence/lookback. | `30` / `300` |
| `RESPONSE_POLL_INTERVAL_SECONDS` / `RESPONSE_ENABLED` | Response manager cadence / master switch. | `30` / `true` |
| `SCENARIO_POLL_INTERVAL_SECONDS` | Scenario runner cadence. | `5` |
| `TRAFFIC_SIM_EVENT_RATE` / `IOT_SIM_EVENT_RATE` / `NETWORK_EMULATOR_EVENT_RATE` | Synthetic event rates. | `2` / `3` / `1` |
| `USE_MOCK_CITY_COMPONENTS` | Deterministic demo data for the 3D city. | `true` |
| `LOG_LEVEL` | Backend/service log level. | `INFO` |

`.env` is git‑ignored and is **not** committed.

---

## API Documentation

Interactive Swagger UI is served at **http://localhost:8000/docs** (OpenAPI JSON at `/openapi.json`).
Main route groups (all under `/api`, JWT‑protected except `/auth/login` and `/health`):

| Group | Examples |
|---|---|
| Auth | `POST /auth/login` |
| Users | `GET/POST /users`, role management |
| Rules | `GET/POST/PUT /rules`, auto‑response config |
| Scenarios | `GET /scenarios`, launch runs |
| Alerts | `GET /alerts`, resolution |
| Actions | `GET /actions`, `POST /actions/execute/{alert_id}`, `GET /actions/audit` |
| Devices | `GET /devices`, register, per‑device actions |
| Metrics | `GET /metrics`, `/metrics/mttd`, `/metrics/mttr`, `/metrics/accuracy` |
| Overview | `GET /overview/stats`, `/overview/city-components` |
| Awareness | `GET /awareness/progress/*` |
| MITRE | `GET /mitre/techniques` |
| Proposals | attack‑proposal review workflow |
| Lab | research‑lab provisioning |
| WebSocket | `GET /ws/city-telemetry` |

See [`docs/api.md`](docs/api.md) for details.

---

## Screenshots

_Add screenshots here._

| View | Image |
|---|---|
| SOC Overview + 3D city | `docs/screenshots/overview.png` _(placeholder)_ |
| Alerts & response actions | `docs/screenshots/alerts.png` _(placeholder)_ |
| Detection rules | `docs/screenshots/rules.png` _(placeholder)_ |
| Security awareness | `docs/screenshots/awareness.png` _(placeholder)_ |

---

## Project Structure

```
CityShield/
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # entry point: startup seeding, routers, CORS, WebSocket
│   │   ├── api/                 # 16 route modules + threat_knowledge
│   │   ├── core/                # config, security (JWT/bcrypt), rbac
│   │   ├── models/              # Pydantic models
│   │   ├── services/            # business logic (attack engine, metrics, actions, …)
│   │   ├── db/                  # OpenSearch client + index mappings
│   │   ├── data/                # detection_rules.json, mitre_techniques.json
│   │   └── utils/               # logging
│   └── tests/                   # pytest suite (79 tests)
├── frontend/                    # React + TypeScript + Vite
│   └── src/
│       ├── pages/               # Overview, Alerts, Rules, Devices, scenarios, …
│       ├── components/          # UI + 3D smart‑city (smartcity/)
│       ├── hooks/               # data, websocket, theme, language
│       └── i18n/                # EN/AR dictionary
├── services/                    # microservices
│   ├── detection_engine/        # rule runtime + 75 YAML rules + enrichment
│   ├── response_manager/        # Ansible executor + playbooks_map.yml
│   ├── scenario_runner/         # drives simulators from scenario_runs
│   ├── simulators/              # traffic_sim, iot_sim, network_emulator
│   ├── attacker/  range_logger/ # cyber range (Kali + tcpdump)
│   ├── iot_target/  iot_range_logger/
│   └── researcher-lab/          # per‑user lab image
├── infrastructure/
│   ├── ansible/playbooks/       # 12 response playbooks
│   ├── filebeat/                # log shipping config
│   └── dashboards/              # OpenSearch saved objects
├── scripts/                     # bootstrap, metrics, dataset, verification scripts
├── data/sample/                 # sample log events
├── docs/                        # technical docs (architecture, threat model, API, rules, …)
│   └── academic/                # academic deliverables: report, paper, slides, proposals (non‑runtime)
├── docker-compose.yml           # 17 services, 3 networks, 2 volumes
├── .env.example                 # environment template
├── SETUP_GUIDE.md               # macOS & Windows setup guide
├── SECURITY_REPORT.md           # security review & hardening checklist
└── README.md
```

---

## Security Features

- **JWT authentication** (HS256) with bcrypt‑hashed passwords.
- **Role‑based access control** enforced server‑side on every protected route.
- **Configurable CORS allow‑list** (`CORS_ALLOWED_ORIGINS`) — no wildcard with credentials.
- **Secrets via environment variables** (`.env`, git‑ignored); no secrets committed to the repo.
- **Network isolation** — the cyber range and IoT range run on `internal` Docker networks.
- **Non‑root containers** for application/simulator images.
- **Full audit logging** of every response action in `action-audit-log`.
- **Per‑rule guardrails** for auto‑response: minimum severity, enrichment requirement, rate limits,
  cooldowns, subnet whitelists, and optional human confirmation.

> This is a **training/research** platform. Before any production exposure, review
> [SECURITY_REPORT.md](SECURITY_REPORT.md): enable the OpenSearch security plugin + TLS, rotate all
> default credentials, set a strong `BACKEND_JWT_SECRET`, and place the API behind a reverse proxy.

---

## Future Work

Derived from the current implementation:

- Enable OpenSearch security plugin + TLS (currently disabled for local use).
- Add API rate limiting / brute‑force protection on `/auth/login`.
- Expand automated test coverage (backend integration tests; frontend unit/E2E tests).
- Code‑split the large frontend bundle (3D + heavy pages) for faster initial load.
- External secrets management (Vault / cloud secret manager) for production.
- Kubernetes manifests for multi‑node / HA deployment.

---

## Quick Start / Full Setup Guide

New to the project? Follow the step‑by‑step, OS‑specific guide:
**➡ [SETUP_GUIDE.md](SETUP_GUIDE.md)** (macOS and Windows).

---

## License

See [LICENSE](LICENSE).
