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

**Important**: Backend tests require a running OpenSearch instance. In CI, tests run against `http://localhost:9200` with `DISABLE_SECURITY_PLUGIN=true`. Required env vars for tests: `OPENSEARCH_URL`, `OPENSEARCH_USER`, `OPENSEARCH_PASS`, `DEFAULT_ADMIN_USER`, `DEFAULT_ADMIN_PASS`, `BACKEND_JWT_SECRET`.

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
- **test-backend**: `pytest tests/ -v` (with OpenSearch 2.11 service container)
- **validate-docker**: `docker compose config`
- **lint-frontend**: `npm run lint`
- **build-frontend**: `npm run build`

## Architecture

**Microservices on Docker Compose** — three Docker networks: `cityshield_network` (main bridge for all services), `cyber_range_net` (isolated network for Metasploitable, attacker, range_logger), and `iot_range_net` (isolated network for IoT target + logger). OpenSearch is the sole data store (no traditional database).

### Layers

- **Frontend** (`frontend/`): React 18 + TypeScript + Vite. Served via nginx in production (port 3000->80). Vite dev server proxies `/api` and `/ws` to backend at `:8000`.
- **Backend API** (`backend/`): FastAPI with JWT auth (HS256, bcrypt passwords) + RBAC (Administrator, Analyst, Researcher). Entry point: `app/main.py`. On startup, auto-creates default admin and researcher users, seeds Metasploitable + IoT range assets, and seeds OWASP scenarios. Serves REST API on `:8000` and a WebSocket at `/ws/city-telemetry`.
- **Data Store**: OpenSearch 2.11 (port 9200). Indices: `logs-traffic`, `logs-iot`, `logs-network`, `alerts`, `rules`, `scenarios`, `users`, `scenario_runs`, `city-assets`, `action-audit-log`, `attack-proposals`.
- **Filebeat** (`infrastructure/filebeat/`): Ships JSONL logs from simulators' shared volume to OpenSearch `logs-*` indices (secondary pipeline; simulators also write directly to OpenSearch).

### Backend Module Layout (`backend/app/`)

- **`api/`** — Route modules: `routes_auth`, `routes_alerts`, `routes_rules`, `routes_scenarios`, `routes_logs`, `routes_metrics`, `routes_users`, `routes_devices`, `routes_overview`, `routes_health`, `routes_websocket`, `routes_lab`, `routes_actions`, `routes_proposals`, `routes_mitre`; data module: `threat_knowledge` (MITRE ATT&CK knowledge base used by alert analysis)
- **`core/`** — `config.py` (Pydantic BaseSettings), `security.py` (JWT + bcrypt), `rbac.py` (role decorators)
- **`models/`** — Pydantic models: `alert`, `device`, `rule`, `scenario`, `user`, `action`, `proposal`
- **`services/`** — Business logic: `attack_engine`, `device_service`, `lab_service`, `metrics_service`, `rule_service`, `scenario_service`, `action_service`, `proposal_service`
- **`data/`** — Static data files: `mitre_techniques.json` (75 curated MITRE ATT&CK techniques), `detection_rules.json` (75 rules exported from YAML, seeded into OpenSearch on startup)
- **`db/`** — `opensearch_client.py` (client wrapper + index creation with full mappings)

### Microservices (`services/`)

All are Python 3.11 containers polling OpenSearch in a loop:

| Service | Purpose | Poll Interval Env | Port |
|---|---|---|---|
| `detection_engine` | Loads YAML rules from `rules/`, queries `logs-*`, writes to `alerts` index, optionally enriches via AbuseIPDB | `DETECTION_POLL_INTERVAL_SECONDS` (30s) | -- |
| `response_manager` | Polls `alerts` for high/critical alerts with auto-response enabled, checks conditions (severity, enrichment, rate limits), executes Ansible playbooks, creates audit log entries | `RESPONSE_POLL_INTERVAL_SECONDS` (30s) | -- |
| `scenario_runner` | Polls `scenario_runs` for pending runs, sends HTTP commands to simulators | `SCENARIO_POLL_INTERVAL_SECONDS` (5s) | -- |

### Simulators (`services/simulators/`)

Each is a FastAPI app with a background thread generating events, writing to both JSONL files and OpenSearch directly:

| Simulator | Port | Index | Endpoints |
|---|---|---|---|
| `traffic_sim` | 8001 | `logs-traffic` | `/health`, `/status`, `/mode`, `/attack/start`, `/attack/stop` |
| `iot_sim` | 8002 | `logs-iot` | Same pattern |
| `network_emulator` | 8003 | `logs-network` | Same pattern |

### Cyber Range & IoT Range

- **Cyber Range** (`cyber_range_net`, 172.20.0.0/16): `metasploitable` (vulnerable target, 172.20.0.2), `attacker` (Kali Linux with nmap/netcat/curl), `range_logger` (tcpdump to JSONL)
- **IoT Range** (`iot_range_net`, 172.21.0.0/16): `iot_target` (FastAPI IoT sensor hub, HTTP :8080 + TCP :1883, 172.21.0.2), `iot_range_logger` (tcpdump)
- **Research Lab** (`services/researcher-lab/`): Per-user Ubuntu container provisioned via UI, connected to all three networks. Managed by `backend/app/services/lab_service.py` via Docker API.

### Key Data Flows

1. Simulators generate JSON events -> written to OpenSearch `logs-*` indices (and JSONL files)
2. Detection engine polls `logs-*` -> matches YAML rules -> writes `alerts` documents
3. Response manager polls `alerts` -> checks auto-response config -> validates conditions (severity, enrichment, rate limits) -> executes Ansible playbooks -> creates audit log entries in `action-audit-log`
4. Frontend fetches via REST (`/api/*`) and receives real-time updates via WebSocket (`/ws/city-telemetry`)
5. Manual actions: User triggers action from Alerts UI -> backend queues action in `action-audit-log` -> response manager executes -> updates audit entry with results

### Frontend Architecture

- Auth state held in `App.tsx` (no context provider); JWT stored in `localStorage` key `token`
- Two data channels: REST polling (5s intervals in `useCityData` hook) and authenticated WebSocket (`useAssetStream` hook)
- 3D city visualization uses React Three Fiber (`components/smartcity/`) -- buildings represent city components with color/height reflecting status and event count
- Pages: `Overview` (dashboard + 3D city), `Alerts`, `Rules`, `ScenarioBuilder`, `CustomScenarioBuilder`, `DeviceManagement`, `AdminUsers`, `AttackProposals`, `SecurityAwareness`, `Login`
- All routes except `/login` wrapped in `ProtectedRoute`

## Prerequisites

- Docker Desktop 4.x+ with Docker Compose 2.x+
- 8GB RAM minimum (16GB recommended), 20GB free disk space
- On Linux, OpenSearch requires: `sysctl -w vm.max_map_count=262144`

## Environment Configuration

Copy `.env.example` to `.env` before running (bootstrap.sh does this automatically). Key variables:
- `OPENSEARCH_URL`, `OPENSEARCH_USER`, `OPENSEARCH_PASS` -- data store connection
- `BACKEND_JWT_SECRET` -- must be changed from default
- `DEFAULT_ADMIN_USER`, `DEFAULT_ADMIN_PASS` -- created on backend startup
- `USE_MOCK_CITY_COMPONENTS` -- set `true` for deterministic demo data
- `THREAT_INTEL_PROVIDER` -- `mock` (default) or `abuseipdb`
- Simulator event rates: `TRAFFIC_SIM_EVENT_RATE`, `IOT_SIM_EVENT_RATE`, `NETWORK_EMULATOR_EVENT_RATE`
- `DETECTION_QUERY_WINDOW_SECONDS` (300) -- lookback window for rule evaluation

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

75 YAML rules in `services/detection_engine/rules/`. Each rule specifies `match_logic`, severity, query window, MITRE technique mapping, response actions, log sources, and false positive notes. Restart `detection_engine` container after adding/modifying rules.

The rule engine (`services/detection_engine/rule_runtime.py`) uses `.keyword` suffix for text field aggregations in OpenSearch queries. Match logic types include: `net_scan`, `iot_anomaly`, `brute_force`, `c2_beacon`, `data_exfiltration`, `ddos_attack`, `dos_endpoint`, `ransomware`, `web_exploit`, `lateral_movement`, `credential_dump`, `log_clearing`, `cmd_execution`, `account_creation`, `data_archiving`, `defense_evasion`, `obfuscation_detection`, `powershell_execution`, `process_injection`, `registry_persistence`, `scheduled_task_creation`, `screen_capture`, `service_execution`, `service_persistence`, `token_manipulation`.

Response actions map to Ansible playbooks via `services/response_manager/playbooks_map.yml`: `block_ip`, `isolate_service`, `revoke_token`, `quarantine_host`, `disable_account`, `rate_limit`, `snapshot_forensics`, `kill_process`, `reset_credentials`, `notify_soc`, `escalate_incident`, `network_segmentation`. All 12 playbooks exist in `infrastructure/ansible/playbooks/`.

## Auto-Response System

Each detection rule can have auto-response configured (enable/disable, minimum severity, require enrichment, max executions/hour, cooldown period, rate limit window, human confirmation, allowed actions, whitelisted subnets). The detection engine checks whitelisted subnets before creating alerts (suppresses whitelisted sources). The response manager validates remaining conditions and executes Ansible playbooks, logging to `action-audit-log` index with `execution_type: automated`. Whitelisted alerts are auto-resolved with `status: resolved`. Manual actions are also supported from the Alerts UI for Analyst/Admin roles.

RBAC: manual actions require Analyst/Admin; auto-response config requires Researcher/Admin; audit log viewing is available to all authenticated users.

## Documentation

The `docs/` directory contains detailed documentation: architecture, threat model, log schema, detection rules format, response playbooks, scenarios guide, API reference, dashboards, attack execution engine, device inventory, OpenSearch integration, and 3D smart city technical details.
