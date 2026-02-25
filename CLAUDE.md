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
- **Data Store**: OpenSearch 2.11 (port 9200). Indices: `logs-traffic`, `logs-iot`, `logs-network`, `alerts`, `rules`, `scenarios`, `users`, `scenario_runs`, `city-assets`, `action-audit-log`.
- **Filebeat** (`infrastructure/filebeat/`): Ships JSONL logs from simulators' shared volume to OpenSearch `logs-*` indices (secondary pipeline; simulators also write directly to OpenSearch).

### Backend Module Layout (`backend/app/`)

- **`api/`** — Route modules: `routes_auth`, `routes_alerts`, `routes_rules`, `routes_scenarios`, `routes_logs`, `routes_metrics`, `routes_users`, `routes_devices`, `routes_overview`, `routes_health`, `routes_websocket`, `routes_lab`, `routes_actions`, `threat_knowledge`
- **`core/`** — `config.py` (Pydantic BaseSettings), `security.py` (JWT + bcrypt), `rbac.py` (role decorators)
- **`models/`** — Pydantic models: `alert`, `device`, `rule`, `scenario`, `user`, `action`
- **`services/`** — Business logic: `attack_engine`, `device_service`, `lab_service`, `metrics_service`, `rule_service`, `scenario_service`, `action_service`
- **`db/`** — `opensearch_client.py` (client wrapper + index creation with full mappings)

### Microservices (`services/`)

All are Python 3.11 containers polling OpenSearch in a loop:

| Service | Purpose | Poll Interval Env | Port |
|---|---|---|---|
| `detection_engine` | Loads YAML rules from `rules/`, queries `logs-*`, writes to `alerts` index, optionally enriches via AbuseIPDB | `DETECTION_POLL_INTERVAL_SECONDS` (30s) | — |
| `response_manager` | Polls `alerts` for high/critical alerts with auto-response enabled, checks conditions (severity, enrichment, rate limits), executes Ansible playbooks, creates audit log entries | `RESPONSE_POLL_INTERVAL_SECONDS` (30s) | — |
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
3. Response manager polls `alerts` → checks auto-response config → validates conditions (severity, enrichment, rate limits) → executes Ansible playbooks → creates audit log entries in `action-audit-log`
4. Frontend fetches via REST (`/api/*`) and receives real-time updates via WebSocket (`/ws/city-telemetry`)
5. Manual actions: User triggers action from Alerts UI → backend queues action in `action-audit-log` → response manager executes → updates audit entry with results

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

YAML files in `services/detection_engine/rules/`. Each rule specifies `match_logic`, severity, query window, MITRE technique mapping, response actions, log sources, and false positive notes. Restart `detection_engine` container after adding/modifying rules.

### Current Rules (11 Total)

| Rule ID | MITRE Technique | Match Logic Type | Severity | Description |
|---|---|---|---|---|
| `net_scan_001` | T1046 | `net_scan` | high | Network Service Scanning |
| `iot_anomaly_001` | T1565 | `iot_anomaly` | critical | IoT Sensor Data Manipulation |
| `brute_force_001` | T1110 | `brute_force` | high | Brute Force Authentication |
| `c2_beacon_001` | T1071 | `c2_beacon` | critical | C2 Beaconing Detection |
| `data_exfil_001` | T1041 | `data_exfiltration` | critical | Data Exfiltration |
| `ddos_attack_001` | T1498 | `ddos_attack` | critical | DDoS Attack Detection |
| `dos_endpoint_001` | T1499 | `dos_endpoint` | high | Endpoint DoS Detection |
| `ransomware_001` | T1486 | `ransomware` | critical | Ransomware Activity |
| `web_exploit_001` | T1190 | `web_exploit` | high | Web Application Exploitation |
| `lateral_movement_001` | T1570 | `lateral_movement` | high | Lateral Tool Transfer |
| `credential_dump_001` | T1003 | `credential_dump` | critical | OS Credential Dumping |

### Supported Match Logic Types

The rule engine uses `.keyword` suffix for text field aggregations in OpenSearch queries.

- **`net_scan`** — Aggregates distinct destination ports per source IP
- **`iot_anomaly`** — Counts anomaly events per sensor/actor
- **`brute_force`** — Counts failed authentication attempts per source
- **`c2_beacon`** — Detects periodic beaconing patterns
- **`data_exfiltration`** — Detects large data transfers with byte counting
- **`ddos_attack`** — Aggregates traffic to single destination from multiple sources (requires `min_sources` threshold)
- **`dos_endpoint`** — Detects resource exhaustion per asset
- **`ransomware`** — Detects file encryption events (threshold: 1)
- **`web_exploit`** — Detects SQL injection, XSS, command injection patterns
- **`lateral_movement`** — Detects service-to-service propagation
- **`credential_dump`** — Detects credential access attempts

### Response Actions

Response actions map to Ansible playbooks via `services/response_manager/playbooks_map.yml`:

- **`block_ip`** — Block malicious IP address using iptables/firewall rules
- **`isolate_service`** — Isolate compromised service by stopping Docker container
- **`revoke_token`** — Revoke user authentication token

### Rule Structure

```yaml
rule_id: unique_id
name: Rule Name
description: What threat is detected
enabled: true
severity: critical  # low|medium|high|critical
query_window_seconds: 300
match_logic:
  type: ddos_attack
  parameters:
    threshold: 100
    min_sources: 5  # DDoS-specific
    group_by: dst_ip
    event_types:
      - network_connection
      - ddos
technique_id: T1498
technique_name: "Network Denial of Service"
response_actions:
  - block_ip
  - isolate_service
log_sources:
  - logs-network
  - logs-traffic
false_positive_notes: |
  Legitimate traffic spikes during peak hours may trigger this rule.
  Consider adjusting thresholds for high-traffic services.
```

## Action Execution & Auto-Response System

### Manual Action Execution

Users with Analyst or Admin roles can execute response actions manually from the Alerts UI:

1. Navigate to **Alerts** page → Expand alert → Click **Actions** tab
2. View available actions with descriptions and playbook paths
3. Click **Execute** → Confirm action in dialog
4. Action is queued and executed by response_manager
5. Execution results logged in `action-audit-log` index
6. View action history in **Action Execution History** section

### Auto-Response Configuration

Each detection rule can be configured with automated response settings:

**Configuration Options** (via Rules page → Details → Auto-Response Configuration):
- **Enable/Disable** — Toggle automated response execution
- **Minimum Severity** — Only trigger for alerts ≥ specified severity (low/medium/high/critical)
- **Require Enrichment** — Only execute if alert has threat intelligence enrichment
- **Max Executions Per Hour** — Rate limit to prevent runaway automation (1-100)

**How Auto-Response Works:**
1. Alert is created by detection_engine
2. Response_manager polls for alerts with auto-response enabled
3. Validates conditions: severity threshold, enrichment requirement, rate limit
4. Executes configured response actions from rule's `response_actions` list
5. Creates audit log entries with `execution_type: automated` and `triggered_by: system`
6. Updates alert with response details in `response.actions[]` array

### Action Audit Log

All action executions (manual and automated) are logged in the `action-audit-log` OpenSearch index:

**Audit Entry Fields:**
- `audit_id` — Unique execution ID
- `alert_id` — Alert that triggered the action
- `rule_id` — Detection rule ID
- `action_name` — Action executed (block_ip, isolate_service, revoke_token)
- `execution_type` — `manual` or `automated`
- `triggered_by` — Username (manual) or `system` (automated)
- `status` — `pending`, `success`, or `failed`
- `parameters` — Action parameters (IP, service name, user ID)
- `playbook_path` — Ansible playbook executed
- `stdout` / `stderr` — Playbook execution output
- `started_at` / `completed_at` — Timestamps
- `error` — Error message if failed

**Querying Audit Log:**
- `/api/actions/audit` — Query with filters (alert_id, rule_id, action_name, execution_type, status, date range)
- `/api/actions/alert/{alert_id}/history` — All actions for specific alert
- `/api/actions/rule/{rule_id}/history` — All automated executions for specific rule
- `/api/actions/audit/{audit_id}` — Full details for specific execution

### Backend API Endpoints

**Action Execution:**
- `POST /api/actions/execute/{alert_id}` — Execute manual action (Analyst/Admin, requires confirmation)
- `GET /api/actions` — List available actions with metadata
- `GET /api/actions/audit` — Query action audit log with filters
- `GET /api/actions/audit/{audit_id}` — Get specific audit entry details
- `GET /api/actions/alert/{alert_id}/history` — Action history for alert
- `GET /api/actions/rule/{rule_id}/history` — Execution history for rule (auto-response)

**Auto-Response Configuration:**
- `PUT /api/rules/{rule_id}/auto-response` — Update auto-response config (Researcher/Admin)

### Frontend UI

**Alerts Page:**
- **Tab Navigation** — Analysis | Actions | Related Events tabs in expanded alert view
- **Actions Tab** — Available actions cards with Execute buttons + action execution history table
- **Action Confirmation** — Modal with warning, action details, and risk acknowledgment checkbox
- **Execution Details** — Modal showing full audit entry (playbook output, parameters, status)

**Rules Page:**
- **Auto-Response Section** — Enable/disable toggle, conditions panel (severity, enrichment, rate limits)
- **Execution History** — Table of recent automated executions for the rule
- **Save Configuration** — Persists auto-response settings to OpenSearch

**Components:**
- `ActionConfirmDialog.tsx` — Confirmation modal for manual actions
- `ActionHistoryTable.tsx` — Reusable table for action execution history
- `ExecutionDetailsModal.tsx` — Full audit entry viewer with stdout/stderr

### Security & Rate Limiting

**RBAC:**
- Manual action execution: Analyst or Admin role required
- Auto-response configuration: Researcher or Admin role required
- Audit log viewing: All authenticated users

**Rate Limiting:**
- Configurable per rule: `max_executions_per_hour` (default: 10)
- Prevents runaway automation from repeated alerts
- Checked by querying `action-audit-log` for executions in last hour
- Automated executions blocked if limit exceeded

**Audit Trail:**
- All executions logged with username/system and timestamps
- Immutable audit entries (no UPDATE/DELETE operations)
- Supports compliance reporting and forensic analysis
