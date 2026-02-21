# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is CityShield

CityShield is a smart city cyber range platform for training, testing, and evaluating cybersecurity defenses. It simulates smart city infrastructure (traffic, IoT, network), generates realistic attack scenarios, detects threats using MITRE ATT&CK-aligned rules, and executes automated response playbooks.

## Common Commands

### Full Platform (Docker Compose)

```bash
docker compose up --build          # Start all services
docker compose down                # Stop all services
docker compose logs <service>      # View service logs (e.g., backend, detection_engine)
./scripts/bootstrap.sh             # Initial setup: copies .env.example, starts OpenSearch, creates indices
```

### Backend (Python/FastAPI)

```bash
cd backend
pip install -r requirements.txt
pytest                             # Run all tests (configured in pytest.ini, testpaths=tests)
pytest tests/test_security.py      # Run a single test file
ruff check app/                    # Lint backend code
```

### Frontend (React/TypeScript/Vite)

```bash
cd frontend
npm install
npm run dev                        # Dev server on :3000 with proxy to backend :8000
npm run build                      # TypeScript check + Vite production build
npm run lint                       # ESLint (ts,tsx)
```

## Architecture

**Microservices on Docker Compose** — all services communicate over an isolated `cityshield_network` bridge. OpenSearch is the sole data store (no traditional database).

### Layers

- **Frontend** (`frontend/`): React 18 + TypeScript + Vite. Served via nginx in production (port 3000→80). Vite dev server proxies `/api` to backend at `:8000`.
- **Backend API** (`backend/`): FastAPI with JWT auth + RBAC (Administrator, Analyst, Researcher). Entry point: `app/main.py`. Serves REST API on `:8000` and a WebSocket endpoint at `/ws/city-telemetry`.
- **Data Store**: OpenSearch 2.11 (port 9200). Indices: `logs-traffic`, `logs-iot`, `logs-network`, `alerts`, `rules`, `scenarios`, `users`, `scenario_runs`.
- **Filebeat** (`infrastructure/filebeat/`): Ships JSONL logs from simulators' shared volume to OpenSearch `logs-*` indices (secondary pipeline; simulators also write directly to OpenSearch).

### Microservices (`services/`)

All are Python 3.11 containers polling OpenSearch in a loop:

| Service | Purpose | Poll Interval Env | Port |
|---|---|---|---|
| `detection_engine` | Loads YAML rules from `rules/`, queries `logs-*`, writes to `alerts` index, optionally enriches via AbuseIPDB | `DETECTION_POLL_INTERVAL_SECONDS` (30s) | — |
| `response_manager` | Polls `alerts` for high/critical unresponded alerts, executes Ansible playbooks | `RESPONSE_POLL_INTERVAL_SECONDS` (30s) | — |
| `scenario_runner` | Polls `scenario_runs` for pending runs, sends HTTP commands to simulators | `SCENARIO_POLL_INTERVAL_SECONDS` (5s) | — |

### Simulators (`services/simulators/`)

Each is a FastAPI app with a background thread generating events, writing to both JSONL files and OpenSearch directly:

| Simulator | Port | Index | Endpoints |
|---|---|---|---|
| `traffic_sim` | 8001 | `logs-traffic` | `/health`, `/status`, `/mode`, `/attack/start`, `/attack/stop` |
| `iot_sim` | 8002 | `logs-iot` | Same pattern |
| `network_emulator` | 8003 | `logs-network` | Same pattern |

### Key Data Flows

1. Simulators generate JSON events → written to OpenSearch `logs-*` indices (and JSONL files)
2. Detection engine polls `logs-*` → matches YAML rules → writes `alerts` documents
3. Response manager polls `alerts` → executes Ansible playbooks from `infrastructure/ansible/playbooks/`
4. Frontend fetches via REST (`/api/*`) and receives real-time updates via WebSocket (`/ws/city-telemetry`)

### Frontend Architecture

- Auth state held in `App.tsx` (no context provider); JWT stored in `localStorage` key `token`
- Two data channels: REST polling (5s intervals in `useCityData` hook) and authenticated WebSocket (`useAssetStream` hook)
- 3D city visualization uses React Three Fiber (`components/smartcity/`) — buildings represent city components with color/height reflecting status and event count
- All routes except `/login` wrapped in `ProtectedRoute`

## Environment Configuration

Copy `.env.example` to `.env` before running. Key variables:
- `OPENSEARCH_URL`, `OPENSEARCH_USER`, `OPENSEARCH_PASS` — data store connection
- `BACKEND_JWT_SECRET` — must be changed from default
- `DEFAULT_ADMIN_USER`, `DEFAULT_ADMIN_PASS` — created on backend startup
- `USE_MOCK_CITY_COMPONENTS` — set `true` for deterministic demo data
- `THREAT_INTEL_PROVIDER` — `mock` (default) or `abuseipdb`
- Simulator event rates: `TRAFFIC_SIM_EVENT_RATE`, `IOT_SIM_EVENT_RATE`, `NETWORK_EMULATOR_EVENT_RATE`

## Service Ports

| Service | Port |
|---|---|
| Frontend | 3000 |
| Backend API + Swagger docs | 8000 (/docs) |
| OpenSearch | 9200 |
| OpenSearch Dashboards | 5601 |

## Detection Rules

YAML files in `services/detection_engine/rules/`. Each rule specifies `match_logic`, severity, query window, MITRE technique mapping, and response actions. Restart `detection_engine` container after adding/modifying rules.
