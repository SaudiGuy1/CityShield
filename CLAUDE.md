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
pytest tests/test_security.py::test_jwt_creation  # Run a single test function
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

### Useful Scripts

```bash
scripts/bootstrap.sh               # Full platform init (Docker check, OpenSearch, indices, assets)
scripts/create_indices.py           # Manually create OpenSearch indices
scripts/create_assets_simple.sh     # Populate city-assets index
scripts/compute_metrics.py          # Post-run MTTD/MTTR/detection accuracy evaluation
scripts/run_scenario.py             # Run a scenario from the command line
scripts/verify_cyber_range.sh       # Health check for cyber range components
scripts/verify_production.sh        # Production deployment verification
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main` and `develop`:
- **lint-backend**: `ruff check app/`
- **test-backend**: `pytest tests/ -v`
- **validate-docker**: `docker compose config`
- **lint-frontend**: `npm run lint`
- **build-frontend**: `npm run build`

## Architecture

**Microservices on Docker Compose** — two Docker networks: `cityshield_network` (main bridge for all services) and `cyber_range_net` (isolated network for Metasploitable, attacker, range_logger). OpenSearch is the sole data store (no traditional database).

### Layers

- **Frontend** (`frontend/`): React 18 + TypeScript + Vite. Served via nginx in production (port 3000→80). Vite dev server proxies `/api` and `/ws` to backend at `:8000`.
- **Backend API** (`backend/`): FastAPI with JWT auth (HS256, bcrypt passwords) + RBAC (Administrator, Analyst, Researcher). Entry point: `app/main.py`. On startup, auto-creates default admin user and seeds Metasploitable asset into `city-assets` index. Serves REST API on `:8000` and a WebSocket at `/ws/city-telemetry`.
- **Data Store**: OpenSearch 2.11 (port 9200). Indices: `logs-traffic`, `logs-iot`, `logs-network`, `alerts`, `rules`, `scenarios`, `users`, `scenario_runs`, `city-assets`.
- **Filebeat** (`infrastructure/filebeat/`): Ships JSONL logs from simulators' shared volume to OpenSearch `logs-*` indices (secondary pipeline; simulators also write directly to OpenSearch).

### Backend Module Layout (`backend/app/`)

- **`api/`** — Route modules: `routes_auth`, `routes_alerts`, `routes_rules`, `routes_scenarios`, `routes_logs`, `routes_metrics`, `routes_users`, `routes_devices`, `routes_overview`, `routes_health`, `routes_websocket`, `routes_lab`, `threat_knowledge`
- **`core/`** — `config.py` (Pydantic BaseSettings), `security.py` (JWT + bcrypt), `rbac.py` (role decorators)
- **`models/`** — Pydantic models: `alert`, `device`, `rule`, `scenario`, `user`
- **`services/`** — Business logic: `attack_engine`, `device_service`, `lab_service`, `metrics_service`, `rule_service`, `scenario_service`
- **`db/`** — `opensearch_client.py` (client wrapper + index creation with full mappings)

### Microservices (`services/`)

All are Python 3.11 containers polling OpenSearch in a loop:

| Service | Purpose | Poll Interval Env | Port |
|---|---|---|---|
| `detection_engine` | Loads YAML rules from `rules/`, queries `logs-*`, writes to `alerts` index, optionally enriches via AbuseIPDB | `DETECTION_POLL_INTERVAL_SECONDS` (30s) | — |
| `response_manager` | Polls `alerts` for high/critical unresponded alerts, executes Ansible playbooks mapped via `playbooks_map.yml` | `RESPONSE_POLL_INTERVAL_SECONDS` (30s) | — |
| `scenario_runner` | Polls `scenario_runs` for pending runs, sends HTTP commands to simulators | `SCENARIO_POLL_INTERVAL_SECONDS` (5s) | — |

### Simulators (`services/simulators/`)

Each is a FastAPI app with a background thread generating events, writing to both JSONL files and OpenSearch directly:

| Simulator | Port | Index | Endpoints |
|---|---|---|---|
| `traffic_sim` | 8001 | `logs-traffic` | `/health`, `/status`, `/mode`, `/attack/start`, `/attack/stop` |
| `iot_sim` | 8002 | `logs-iot` | Same pattern |
| `network_emulator` | 8003 | `logs-network` | Same pattern |

### Cyber Range Components

On the isolated `cyber_range_net` network:
- **`metasploitable`** — Vulnerable target VM (tleemcjr/metasploitable2)
- **`attacker`** — Kali Linux container with nmap, netcat, curl
- **`range_logger`** — Python tcpdump service capturing packets to JSONL for Filebeat

### Key Data Flows

1. Simulators generate JSON events → written to OpenSearch `logs-*` indices (and JSONL files)
2. Detection engine polls `logs-*` → matches YAML rules → writes `alerts` documents
3. Response manager polls `alerts` → executes Ansible playbooks from `infrastructure/ansible/playbooks/`
4. Frontend fetches via REST (`/api/*`) and receives real-time updates via WebSocket (`/ws/city-telemetry`)

### Frontend Architecture

- Auth state held in `App.tsx` (no context provider); JWT stored in `localStorage` key `token`
- Two data channels: REST polling (5s intervals in `useCityData` hook) and authenticated WebSocket (`useAssetStream` hook)
- 3D city visualization uses React Three Fiber (`components/smartcity/`) — buildings represent city components with color/height reflecting status and event count
- Pages: `Overview` (dashboard + 3D city), `Alerts`, `Rules`, `ScenarioBuilder`, `CustomScenarioBuilder`, `DeviceManagement`, `AdminUsers`, `Login`
- All routes except `/login` wrapped in `ProtectedRoute`

## Environment Configuration

Copy `.env.example` to `.env` before running. Key variables:
- `OPENSEARCH_URL`, `OPENSEARCH_USER`, `OPENSEARCH_PASS` — data store connection
- `BACKEND_JWT_SECRET` — must be changed from default
- `DEFAULT_ADMIN_USER`, `DEFAULT_ADMIN_PASS` — created on backend startup
- `USE_MOCK_CITY_COMPONENTS` — set `true` for deterministic demo data
- `THREAT_INTEL_PROVIDER` — `mock` (default) or `abuseipdb`
- Simulator event rates: `TRAFFIC_SIM_EVENT_RATE`, `IOT_SIM_EVENT_RATE`, `NETWORK_EMULATOR_EVENT_RATE`
- `DETECTION_QUERY_WINDOW_SECONDS` (300) — lookback window for rule evaluation

## Service Ports

| Service | Port |
|---|---|
| Frontend | 3000 |
| Backend API + Swagger docs | 8000 (/docs) |
| OpenSearch | 9200 |
| OpenSearch Dashboards | 5601 |
| Traffic Simulator | 8001 |
| IoT Simulator | 8002 |
| Network Emulator | 8003 |

## Detection Rules

YAML files in `services/detection_engine/rules/`. Each rule specifies `match_logic`, severity, query window, MITRE technique mapping, and response actions. Restart `detection_engine` container after adding/modifying rules.

Five supported `match_logic.type` values: `net_scan`, `iot_anomaly`, `brute_force`, `c2_beacon`, `data_exfiltration`. The rule engine uses `.keyword` suffix for text field aggregations in OpenSearch queries.

Response actions map to Ansible playbooks via `services/response_manager/playbooks_map.yml`: `block_ip`, `isolate_service`, `revoke_token`.
