# CityShield - Complete Technical Documentation

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Features](#3-features)
- [4. System Architecture](#4-system-architecture)
- [5. Tech Stack](#5-tech-stack)
- [6. Folder Structure](#6-folder-structure)
- [7. How It Works (Step-by-Step)](#7-how-it-works-step-by-step)
- [8. Key Code Components](#8-key-code-components)
- [9. Setup & Installation](#9-setup--installation)
- [10. API Documentation](#10-api-documentation)
- [11. Database Design](#11-database-design)
- [12. Challenges & Solutions](#12-challenges--solutions)
- [13. Future Improvements](#13-future-improvements)

---

## 1. Project Overview

**CityShield** is a smart city cyber range platform — a fully containerized security operations training environment that simulates a smart city's critical infrastructure, generates realistic cyberattack traffic, detects threats using MITRE ATT&CK-aligned detection rules, and executes automated incident response playbooks.

### Purpose

Provide cybersecurity professionals with a safe, realistic, and interactive environment to:
- Practice attack detection and incident response workflows
- Test detection rules against real attack patterns
- Evaluate automated response playbook effectiveness
- Train on MITRE ATT&CK techniques in a smart city context

### Target Users

| Role | Use Case |
|------|----------|
| **Security Analysts** | Investigate alerts, execute response actions, analyze attack timelines |
| **Security Researchers** | Build custom attack scenarios, submit attack proposals, tune detection rules |
| **Administrators** | Manage users, configure platform, approve proposals, control devices |
| **Cybersecurity Students** | Learn through interactive scenarios, awareness training, and hands-on labs |

---

## 2. Problem Statement

### The Gap

Traditional cybersecurity training relies on static exercises, isolated CTF challenges, or expensive commercial ranges. These environments lack:
- **Realistic smart city context** — modern threats target interconnected urban infrastructure (traffic systems, IoT sensors, industrial control systems), not just generic servers
- **End-to-end visibility** — most training tools focus on either attack execution OR detection, not the full kill chain from event generation through detection to automated response
- **Accessible lab environments** — setting up vulnerable targets, attack tools, and monitoring infrastructure requires significant DevOps effort

### Why It Matters

Smart cities are expanding globally, connecting traffic management, IoT sensor networks, SCADA systems, and public safety infrastructure. These systems present high-value targets:
- A compromised traffic controller can cause physical harm
- IoT botnets can be weaponized for DDoS at city scale
- Ransomware on industrial systems can shut down essential services

Security teams defending this infrastructure need to practice in environments that mirror real smart city architectures — not generic corporate networks.

### What CityShield Solves

CityShield provides a self-contained, Docker-based platform that:
- Deploys a full smart city simulation with traffic, IoT, and network infrastructure
- Generates authentic attack traffic (not replayed PCAPs) against realistic targets
- Runs 25 detection rules mapped to MITRE ATT&CK in real time
- Executes automated response playbooks with full audit trails
- Visualizes the city and attacks in an interactive 3D environment
- Includes isolated cyber range and IoT range with real vulnerable targets (Metasploitable, IoT sensor hub)
- Provides per-user research lab containers with pre-installed security tools

---

## 3. Features

### Core Platform

- **3 Simulators** — Traffic management, IoT sensors, and network emulator microservices generating continuous event streams (configurable rates: 1-3 events/sec each)
- **25 Detection Rules** — YAML-based rules aligned to MITRE ATT&CK techniques (T1046, T1110, T1071, T1498, T1486, etc.), each with configurable thresholds, query windows, and severity levels
- **Automated Response** — Response manager executes Ansible playbooks (block_ip, isolate_service, revoke_token) with configurable auto-response per rule (severity threshold, enrichment requirement, rate limiting)
- **Immutable Audit Trail** — Every action (manual and automated) logged in `action-audit-log` index with full playbook stdout/stderr capture

### Attack Simulation

- **21+ Built-in Scenarios** — Including 11 domain-specific scenarios (SSH Brute Force, DDoS, Ransomware, IoT Botnet, SCADA Compromise, etc.) and 10 OWASP Top 10-aligned scenarios (A01-A10:2021)
- **Custom Scenario Builder** — Researchers can chain 31 MITRE ATT&CK techniques with per-technique parameters into custom multi-stage attack scenarios
- **Real Attack Execution Engine** — Generates authentic malicious traffic (not simulated): brute force attempts, port scans, C2 beaconing, data exfiltration with proper network characteristics
- **4-Stage Attack Progression** — Each scenario follows a realistic kill chain (Enumeration, Initial Spray, Intensive Attack, Access Breach) with real-time stage tracking
- **Attack Proposals** — Researchers submit attack proposals for admin approval before execution, supporting controlled research workflows

### Training Environments

- **Cyber Range** — Isolated network (172.20.0.0/16) with a real Metasploitable2 vulnerable target and Kali Linux attacker container. Live packet capture via tcpdump, parsed to JSON, indexed in OpenSearch
- **IoT Range** — Isolated network (172.21.0.0/16) with a FastAPI-based IoT sensor hub (HTTP :8080, MQTT-like TCP :1883) serving randomized sensor data
- **Research Lab** — Per-user Ubuntu containers provisioned on-demand via UI, pre-installed with nmap, hydra, nikto, tcpdump, python3, and more. Connected to all three Docker networks for direct access to both training targets
- **Security Awareness Module** — Interactive training portal with phishing, password security, data protection, and incident reporting modules plus a 5-question knowledge assessment

### Visualization & UI

- **Interactive 3D Smart City** — React Three Fiber-powered 3D city with 6 zones (Traffic, IoT, Network, Security, Industrial, Cyber Range). Buildings represent real assets with color/height reflecting status and alert severity
- **Live Attack Visualization** — During active scenarios, targeted district buildings flash red with scale pulsing, point lights, and rotating ground rings. Attack panel overlay shows real-time stage progression
- **Cyberpunk Theme** — Dark UI with glassmorphism, neon accents (cyan/pink/green), Orbitron/Rajdhani fonts, smooth page transitions via Framer Motion
- **Real-Time Data** — Dual data channels: REST polling (5s intervals) and authenticated WebSocket (`/ws/city-telemetry`) for sub-second asset state updates

### Threat Intelligence

- **MITRE ATT&CK Integration** — 31 techniques with tactic mapping, searchable in the Custom Scenario Builder. Alerts tagged with technique_id and technique_name
- **Threat Intel Enrichment** — Detection engine optionally enriches alerts via AbuseIPDB API (configurable, defaults to mock provider)
- **Alert Analysis** — AI-powered threat analysis with MITRE context, remediation recommendations, and event replay timeline

### Access Control

- **JWT Authentication** — HS256 tokens with configurable expiration, bcrypt password hashing
- **3-Tier RBAC** — Administrator (full access), Analyst (alert investigation + action execution), Researcher (scenario creation + rule management)
- **Device Power Control** — Admins can toggle device status (active/inactive) from Device Management page or 3D Asset Inspector, with real-time visual feedback

---

## 4. System Architecture

### High-Level Architecture Diagram

```
                         +--------------------------------------------------+
                         |              Frontend (React + Three.js)          |
                         |   3D City | Alerts | Scenarios | Devices | Labs  |
                         +-------------------------+------------------------+
                                                   |
                                     REST API + WebSocket (/ws/city-telemetry)
                                                   |
                         +-------------------------v------------------------+
                         |           Backend API (FastAPI + JWT + RBAC)     |
                         |   Auth | Scenarios | Rules | Alerts | Actions    |
                         +---+---------+------------+-----------+-----------+
                             |         |            |           |
                             v         v            v           v
                 +----------------------------------------------------------+
                 |          OpenSearch 2.11 (Single Data Store)              |
                 |  logs-* | alerts | rules | scenarios | users | assets    |
                 +---+----------+-------------+------------+----------------+
                     |          |             |            |
            +--------+   +-----+------+  +---+----+  +---+-------+
            |            |            |  |        |  |           |
    +-------v---+  +-----v-----+ +---v--v--+ +---v--v-----+ +---v--------+
    | Detection |  |  Response |  | Scenario| |  Filebeat  | |  Research  |
    |  Engine   |  |  Manager  |  |  Runner | | Log Shipper| |    Lab     |
    +-----------+  +-----------+  +---------+ +-----+------+ +------------+
                                                    |
              +-------------------------------------+
              |                  |                   |
      +-------v------+  +------v-------+  +--------v--------+
      | Traffic Sim  |  |   IoT Sim    |  | Network Emulator|
      | (port 8001)  |  |  (port 8002) |  |   (port 8003)   |
      +--------------+  +--------------+  +-----------------+

    +============== Cyber Range (isolated 172.20.0.0/16) ===============+
    |  Attacker (Kali) ----> Metasploitable (target) <---- Range Logger |
    +===================================================================+

    +============== IoT Range (isolated 172.21.0.0/16) =================+
    |  IoT Target (sensor hub, HTTP+MQTT) <---------- IoT Range Logger  |
    +===================================================================+
```

### Docker Network Topology

| Network | Subnet | Type | Purpose |
|---------|--------|------|---------|
| `cityshield_network` | 172.22.0.0/16 | Bridge | Main inter-service communication |
| `cyber_range_net` | 172.20.0.0/16 | Internal | Isolated cyber range (no internet) |
| `iot_range_net` | 172.21.0.0/16 | Internal | Isolated IoT range (no internet) |

The `internal: true` flag on range networks prevents containers from reaching the internet, creating a realistic isolated lab environment.

### Component Interaction Flow

1. **Event Generation**: Three simulators continuously generate JSON events (traffic, IoT, network) and write them to both OpenSearch `logs-*` indices and JSONL files on a shared Docker volume
2. **Log Shipping**: Filebeat tails the JSONL files and ships them to OpenSearch as a secondary ingestion pipeline (redundancy)
3. **Threat Detection**: The detection engine polls `logs-*` indices every 30 seconds, evaluates 25 YAML rules against aggregation queries, and writes matched alerts to the `alerts` index
4. **Automated Response**: The response manager polls the `alerts` index for high/critical alerts with auto-response enabled, validates conditions (severity threshold, enrichment requirement, rate limits), and executes Ansible playbooks
5. **Scenario Orchestration**: When a user starts a scenario, the backend creates a `scenario_runs` record. The scenario runner polls for pending runs, sends HTTP commands to simulator endpoints (`/attack/start`, `/attack/stop`), and tracks stage progression
6. **Frontend Rendering**: The React UI fetches data via REST API (5s polling) and WebSocket (real-time asset updates), rendering the 3D city, alerts, dashboards, and scenario progress

### Data Flow: Attack Scenario End-to-End

```
User clicks "Run Scenario"
    |
    v
Backend creates scenario_run (status=pending) in OpenSearch
    |
    v
Background task launches attack execution engine
    |
    v
For each stage (e.g., Enumeration -> Spray -> Intensive -> Breach):
    |-- Execute attack technique (generates real events)
    |-- Events written to logs-* indices
    |-- Stage status updated in scenario_runs
    |-- Frontend polls stage progress, updates 3D visualization
    |
    v
Detection engine matches events against rules -> creates alerts
    |
    v
Response manager picks up alerts -> executes playbooks -> logs audit entries
    |
    v
Scenario completes: calculates detection rate, identifies gaps
    |
    v
Frontend shows results: events generated, alerts triggered, detection accuracy
```

---

## 5. Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11 | Primary backend language for all services |
| **FastAPI** | 0.109.0 | Async REST API framework with automatic OpenAPI docs |
| **OpenSearch** | 2.11.1 | Document store, search engine, and analytics (sole data store) |
| **opensearch-py** | 2.4.2 | Python client for OpenSearch |
| **PyJWT** | 2.8.0 | JWT token creation and validation (HS256) |
| **bcrypt** | 4.1.2 | Password hashing |
| **Pydantic** | 2.x | Request/response validation via BaseSettings and BaseModel |
| **Uvicorn** | 0.27.0 | ASGI server for FastAPI |
| **PyYAML** | 6.0.1 | Detection rule parsing (YAML format) |
| **Ansible** | (runtime) | Playbook execution for automated response actions |
| **Ruff** | (dev) | Python linter (replaces flake8/black) |
| **Pytest** | (dev) | Test framework |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.2.0 | UI component framework |
| **TypeScript** | 5.3.3 | Type-safe JavaScript |
| **Vite** | 5.0.11 | Build tool and dev server with HMR |
| **Three.js** | 0.160.0 | 3D rendering engine for city visualization |
| **React Three Fiber** | 8.15.12 | React declarative wrapper around Three.js |
| **@react-three/drei** | 9.93.0 | Camera controls, helpers, and 3D primitives |
| **@react-three/postprocessing** | 2.16.2 | Bloom, vignette, and glow post-processing effects |
| **Recharts** | 2.10.3 | Data visualization charts (area, pie, line) |
| **Framer Motion** | 12.x | Page transitions and animation |
| **anime.js** | 3.2.1 | Number/stat card tweening animations |
| **@xterm/xterm** | 5.5.0 | Terminal emulator for research lab |
| **react-router-dom** | 6.21.0 | Client-side routing |
| **ESLint** | 8.56.0 | Linting |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| **Docker Compose** | Multi-container orchestration (16 services, 3 networks) |
| **nginx** | Frontend production server + reverse proxy to backend |
| **Filebeat** | 7.17.18 — Log aggregation and shipping to OpenSearch |
| **OpenSearch Dashboards** | 2.11.1 — Data exploration and visualization UI |
| **tcpdump** | Network packet capture in cyber range and IoT range |
| **GitHub Actions** | CI pipeline (lint, test, build, validate) |

### Cyber Range

| Technology | Purpose |
|-----------|---------|
| **Metasploitable2** | Real vulnerable target VM for hands-on training |
| **Kali Linux** | Attack container with nmap, netcat, curl |
| **Ubuntu 22.04** | Research lab base with security toolset (nmap, hydra, nikto, tcpdump) |

---

## 6. Folder Structure

```
CityShield/
├── backend/                          # FastAPI backend application
│   ├── app/
│   │   ├── main.py                   # App entry point, lifespan events, route registration
│   │   ├── api/                      # Route modules (16 routers)
│   │   │   ├── routes_auth.py        # Login, /me endpoint
│   │   │   ├── routes_alerts.py      # Alert CRUD, analysis, replay events
│   │   │   ├── routes_rules.py       # Rule management, auto-response config
│   │   │   ├── routes_scenarios.py   # Scenario CRUD, run execution, custom scenarios
│   │   │   ├── routes_actions.py     # Manual action execution, audit log queries
│   │   │   ├── routes_devices.py     # Device/asset management
│   │   │   ├── routes_websocket.py   # WebSocket /ws/city-telemetry endpoint
│   │   │   ├── routes_lab.py         # Research lab provisioning
│   │   │   ├── routes_proposals.py   # Attack proposal submission/review
│   │   │   ├── routes_mitre.py       # MITRE ATT&CK technique lookup
│   │   │   ├── routes_users.py       # User CRUD
│   │   │   ├── routes_metrics.py     # MTTD/MTTR computation
│   │   │   ├── routes_logs.py        # Raw log querying
│   │   │   ├── routes_overview.py    # Dashboard aggregation
│   │   │   ├── routes_health.py      # Health check
│   │   │   └── threat_knowledge.py   # MITRE ATT&CK knowledge base for analysis
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings (env vars)
│   │   │   ├── security.py           # JWT creation/validation + bcrypt
│   │   │   └── rbac.py               # Role decorators (require_admin, etc.)
│   │   ├── models/                   # Pydantic request/response models
│   │   │   ├── alert.py, action.py, device.py, proposal.py
│   │   │   ├── rule.py, scenario.py, user.py
│   │   ├── services/                 # Business logic layer
│   │   │   ├── attack_engine.py      # Real attack traffic generation engine
│   │   │   ├── scenario_service.py   # Scenario/run CRUD + stage templates
│   │   │   ├── action_service.py     # Action execution + audit logging
│   │   │   ├── rule_service.py       # Rule CRUD
│   │   │   ├── device_service.py     # Device management
│   │   │   ├── lab_service.py        # Docker API for lab containers
│   │   │   ├── metrics_service.py    # MTTD/MTTR calculation
│   │   │   └── proposal_service.py   # Proposal workflow
│   │   ├── db/
│   │   │   └── opensearch_client.py  # Client wrapper + index creation + mappings
│   │   └── data/
│   │       └── mitre_techniques.json # Curated MITRE ATT&CK technique catalog
│   ├── tests/
│   │   ├── conftest.py               # Fixtures (test client, auth headers, mock data)
│   │   ├── test_security.py          # JWT + bcrypt unit tests
│   │   ├── test_rbac.py              # Role validation tests
│   │   └── test_actions.py           # Action execution integration tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini                    # testpaths=tests, -v --tb=short
│
├── frontend/                         # React + TypeScript + Vite
│   ├── src/
│   │   ├── main.tsx                  # React DOM entry point
│   │   ├── App.tsx                   # Root component (auth state, routing)
│   │   ├── pages/                    # Page components (11 pages)
│   │   │   ├── Overview.tsx          # Dashboard + 3D city + charts
│   │   │   ├── Alerts.tsx            # Alert investigation (analysis/actions/events tabs)
│   │   │   ├── Rules.tsx             # Rule management + auto-response config
│   │   │   ├── ScenarioBuilder.tsx   # Scenario launcher + research lab tab
│   │   │   ├── CustomScenarioBuilder.tsx  # MITRE technique chaining
│   │   │   ├── DeviceManagement.tsx  # Device inventory + power control
│   │   │   ├── SecurityAwareness.tsx # Training modules + quiz
│   │   │   ├── AttackProposals.tsx   # Proposal submit/review
│   │   │   ├── AdminUsers.tsx        # User administration
│   │   │   ├── Login.tsx             # Authentication
│   │   │   └── SmartCityDashboard.tsx # Dedicated 3D city view
│   │   ├── components/
│   │   │   ├── smartcity/            # 3D visualization (19 files)
│   │   │   │   ├── CityScene.tsx     # Canvas setup, lighting, post-processing
│   │   │   │   ├── CityLayout.tsx    # Building placement + zone management
│   │   │   │   ├── CyberpunkBuilding.tsx  # Procedural buildings with lit windows
│   │   │   │   ├── CyberpunkGround.tsx    # Animated grid floor
│   │   │   │   ├── CyberpunkRoads.tsx     # Neon road network
│   │   │   │   ├── District.tsx           # Grouped asset zones
│   │   │   │   ├── AttackPathVisualizer.tsx # Animated attack flow lines
│   │   │   │   ├── AssetInspectorPanel.tsx  # Click-to-inspect device panel
│   │   │   │   ├── materials.ts           # Status-based materials + colors
│   │   │   │   └── useCityData.ts         # REST polling hook (5s)
│   │   │   ├── SmartCityMap3D.tsx    # 3D city integration component
│   │   │   ├── ActionConfirmDialog.tsx    # Action execution confirmation modal
│   │   │   ├── ActionHistoryTable.tsx     # Action audit log table
│   │   │   ├── ExecutionDetailsModal.tsx  # Playbook output viewer
│   │   │   ├── Nav.tsx               # Sidebar navigation (role-based)
│   │   │   ├── ProtectedRoute.tsx    # Auth route guard
│   │   │   └── PageTransition.tsx    # Framer Motion page transitions
│   │   ├── hooks/
│   │   │   └── useAssetStream.ts     # WebSocket hook for real-time asset data
│   │   ├── types/
│   │   │   └── assets.ts             # TypeScript interfaces (CityAsset, AttackPath)
│   │   └── styles/
│   │       └── index.css             # Global cyberpunk theme (glassmorphism, neon)
│   ├── nginx.conf                    # Production config (SPA + reverse proxy)
│   ├── Dockerfile
│   ├── vite.config.ts                # Dev proxy to backend, port 3000
│   ├── tsconfig.json
│   └── package.json
│
├── services/                         # Microservices
│   ├── detection_engine/
│   │   ├── main.py                   # Poll loop: load rules -> query logs -> write alerts
│   │   ├── rule_runtime.py           # 25 match logic implementations
│   │   ├── alert_writer.py           # Alert document creation
│   │   ├── enrichment.py             # Threat intel (AbuseIPDB / mock)
│   │   └── rules/                    # 25 YAML detection rule files
│   │       ├── brute_force_001.yml
│   │       ├── ddos_attack_001.yml
│   │       ├── ransomware_001.yml
│   │       └── ... (22 more)
│   ├── response_manager/
│   │   ├── main.py                   # Poll alerts -> validate conditions -> execute
│   │   ├── executor.py               # Ansible playbook runner (300s timeout)
│   │   └── playbooks_map.yml         # Action -> playbook path mapping
│   ├── scenario_runner/
│   │   ├── main.py                   # Poll scenario_runs -> dispatch to simulators
│   │   └── runner.py                 # Step execution + HTTP calls to simulators
│   ├── simulators/
│   │   ├── traffic_sim/              # Traffic events (vehicles, signals, violations)
│   │   ├── iot_sim/                  # IoT events (100 sensors: temp, humidity, etc.)
│   │   └── network_emulator/         # Network events (connections, protocols)
│   ├── attacker/                     # Kali Linux Dockerfile (nmap, netcat, curl)
│   ├── range_logger/                 # tcpdump -> JSON for cyber range
│   ├── iot_target/                   # FastAPI IoT sensor hub (HTTP + MQTT)
│   ├── iot_range_logger/             # tcpdump -> JSON for IoT range
│   └── researcher-lab/               # Ubuntu 22.04 + security tools Dockerfile
│
├── infrastructure/
│   ├── filebeat/
│   │   └── filebeat.yml              # Log tailing + OpenSearch output config
│   └── ansible/
│       ├── inventory.ini             # Ansible host inventory
│       └── playbooks/                # Response playbooks
│           ├── block_ip.yml          # IP blocking via iptables (simulated)
│           ├── isolate_service.yml   # Docker network disconnect (simulated)
│           └── revoke_token.yml      # Token revocation (simulated)
│
├── scripts/
│   ├── bootstrap.sh                  # Full platform initialization
│   ├── create_indices.py             # OpenSearch index creation
│   ├── create_assets_simple.sh       # Seed 25 city assets
│   ├── compute_metrics.py            # Post-run MTTD/MTTR evaluation
│   ├── run_scenario.py               # CLI scenario execution
│   ├── verify_cyber_range.sh         # Cyber range health check
│   └── verify_production.sh          # Production verification
│
├── docs/                             # Extended documentation (12 files)
│   ├── architecture.md, api.md, detection-rules.md
│   ├── response-playbooks.md, scenarios.md, log-schema.md
│   ├── smart-city-3d.md, device-inventory.md, threat-model.md
│   ├── attack-execution.md, dashboards.md, opensearch-integration.md
│
├── data/
│   ├── logs/                         # Simulator JSONL output (Docker volume mount)
│   ├── datasets/                     # Generated labeled datasets
│   └── sample/                       # Sample data files
│
├── docker-compose.yml                # 16 services, 3 networks, 2 volumes
├── .env.example                      # Environment variable template
├── .github/workflows/ci.yml          # GitHub Actions CI pipeline
└── CLAUDE.md                         # AI assistant instructions
```

---

## 7. How It Works (Step-by-Step)

### User Journey: Running an Attack Scenario

**Step 1: Authentication**
- User navigates to `http://localhost:3000`
- Enters credentials on the Login page
- Frontend sends `POST /api/auth/login` with username/password
- Backend validates credentials against OpenSearch `users` index (bcrypt comparison)
- Returns JWT token (HS256, 60-minute expiry)
- Frontend stores token in `localStorage`, fetches user profile via `GET /api/auth/me`

**Step 2: Dashboard Overview**
- Overview page loads, initiating two data channels:
  - REST polling: `GET /api/overview/*`, `GET /api/alerts/stats/summary`, `GET /api/logs/count` every 5 seconds
  - WebSocket: connects to `/ws/city-telemetry?token=<JWT>` for real-time asset updates
- 3D city renders with 25 buildings across 6 zones, colored by status (green=ok, amber=warning, red=critical, gray=offline)
- Dashboard cards show total events, active alerts, detection rate, and asset health

**Step 3: Scenario Selection**
- User navigates to Scenarios page
- Views 21+ available scenarios (11 domain-specific + 10 OWASP)
- Selects "SSH Brute Force Attack" targeting Traffic Management

**Step 4: Attack Execution**
- User clicks "Run Scenario"
- Frontend sends `POST /api/scenarios/runs` with scenario_id
- Backend creates `scenario_run` document in OpenSearch (status=pending)
- Background async task starts the attack execution engine:

  | Stage | Action | Events Generated |
  |-------|--------|-----------------|
  | 1. Target Enumeration | Port scan on 5 hosts, 6 ports each | ~30 port_scan events |
  | 2. Credential Spray | 15 auth attempts, all fail | ~15 auth_failure events |
  | 3. Intensive Attack | 50 rapid auth attempts | ~50 auth_failure events |
  | 4. Access Breach | 10 attempts, final succeeds | ~9 auth_failure + 1 auth_success |

- Events are written to `logs-traffic` OpenSearch index in real time

**Step 5: 3D Attack Visualization**
- Frontend polls `GET /api/scenarios/runs/{run_id}/stages` for real-time progress
- Traffic Management zone buildings begin flashing red with:
  - Pulsing emissive glow (intensity 1.5-5.0)
  - Scale throb effect on attacked buildings
  - Red point light hovering above (intensity 8-20)
  - Rotating ground ring at building base
- Attack panel overlay displays stage timeline, current phase, and explanations

**Step 6: Threat Detection**
- Detection engine runs its 30-second poll cycle
- Rule `brute_force_001` (T1110) evaluates: counts failed auth events per src_ip in 300-second window
- Threshold exceeded (5+ failed attempts from same IP)
- Alert written to `alerts` index with severity=high, MITRE technique mapping, and evidence

**Step 7: Automated Response**
- Response manager polls `alerts` index
- Finds new high-severity alert with auto-response enabled
- Validates conditions: severity >= configured minimum, rate limit not exceeded
- Executes `block_ip` playbook via Ansible
- Creates audit entry in `action-audit-log` (execution_type=automated, triggered_by=system)
- Updates alert with response status

**Step 8: Alert Investigation**
- Alerts page shows new alert with "Attack in Progress" banner (accelerated 2s polling)
- User expands alert to see:
  - **Analysis tab**: MITRE ATT&CK context, threat analysis, remediation recommendations
  - **Actions tab**: Available response actions (block_ip, isolate_service) with execute buttons
  - **Related Events tab**: Timeline replay of events in 5-minute window around trigger

**Step 9: Scenario Completion**
- All 4 stages complete
- Backend calculates results: events generated, alerts triggered, detection rate percentage, detection gaps
- Frontend shows completion status with metrics

### User Journey: Research Lab

1. Researcher navigates to Scenarios -> Research Lab tab
2. Clicks "Provision Lab"
3. Backend uses Docker API to create a container from `cityshield-lab:latest` image
4. Container connects to all three Docker networks
5. Embedded terminal (xterm.js) opens in the browser
6. Researcher can directly interact with targets:
   ```bash
   nmap -sV metasploitable          # Scan Metasploitable (172.20.0.2)
   curl http://iot_target:8080/sensors  # Query IoT sensor hub (172.21.0.2)
   hydra -l admin -P wordlist.txt metasploitable ssh  # Brute force SSH
   ```

---

## 8. Key Code Components

### Backend

| File | Responsibility |
|------|---------------|
| `app/main.py` | FastAPI application factory. Registers 16 routers, runs lifespan events (OpenSearch index creation, default user seeding, OWASP scenario seeding, Metasploitable + IoT asset seeding) |
| `app/core/security.py` | JWT creation (`create_access_token`), token decoding/validation (`decode_token`), password hashing/verification (bcrypt), `get_current_user` FastAPI dependency |
| `app/core/rbac.py` | Decorator factory `require_roles()` and convenience decorators (`require_admin`, `require_analyst_or_admin`, `require_researcher_or_admin`). Validates user role from JWT claims |
| `app/db/opensearch_client.py` | Singleton OpenSearch client wrapper. Creates all indices with explicit field mappings on startup. Provides CRUD helpers for document operations |
| `app/services/attack_engine.py` | Real attack execution engine. Implements 4 specialized techniques (BruteForce, PortScan, C2Beacon, DataExfiltration) that generate authentic malicious traffic events. Tags events with `correlation_id` for tracing |
| `app/services/scenario_service.py` | Scenario CRUD, run lifecycle management. Maps attack patterns to multi-stage execution templates with human-readable stage names. `COMPONENT_DEVICE_MAP` links targets to device IDs |
| `app/services/action_service.py` | Action execution and immutable audit logging. Creates audit entries (status=pending), captures playbook results (stdout/stderr), provides query API with filtering |
| `app/services/lab_service.py` | Docker API integration for per-user research lab containers. Creates/destroys containers, connects to networks, manages volume persistence |
| `app/api/routes_scenarios.py` | Scenario API endpoints. `POST /runs` launches async background tasks for scenario execution. `POST /custom` handles researcher-defined attack chains |
| `app/api/threat_knowledge.py` | MITRE ATT&CK knowledge base. Provides context-aware threat analysis, remediation recommendations, and technique descriptions for alert investigation |

### Detection Engine

| File | Responsibility |
|------|---------------|
| `services/detection_engine/main.py` | Main poll loop. Loads enabled YAML rules from `rules/` directory, creates `logs-*` index template with proper field mappings, evaluates rules every 30 seconds |
| `services/detection_engine/rule_runtime.py` | Core rule evaluation engine. Implements 25 match logic types via OpenSearch aggregation queries. Uses `.keyword` suffix for text field aggregations. Returns alert dictionaries when thresholds are met |
| `services/detection_engine/alert_writer.py` | Creates alert documents with UUID, timestamp, rule metadata, evidence, and enrichment data. Writes to `alerts` OpenSearch index |
| `services/detection_engine/enrichment.py` | Threat intelligence enrichment. Supports AbuseIPDB API (production) or mock provider (default). Enriches alerts with IP reputation scores |

### Response Manager

| File | Responsibility |
|------|---------------|
| `services/response_manager/main.py` | Alert polling loop. Queries for open high/critical alerts, retrieves rule auto-response configuration, validates conditions (severity, enrichment, rate limits), dispatches to executor |
| `services/response_manager/executor.py` | Ansible playbook runner. Executes `ansible-playbook` subprocess with extra vars (IP, service name, user), captures stdout/stderr, enforces 300-second timeout |

### Simulators

| File | Responsibility |
|------|---------------|
| `services/simulators/traffic_sim/` | Generates traffic events (vehicle_movement, traffic_light_change, speed_violation). Attack modes: brute_force (15 failures then success), ddos (multi-source floods), port_scan, ransomware (5-stage progression), mitm |
| `services/simulators/iot_sim/` | Simulates 100 IoT sensors (20 each of temperature, humidity, air_quality, noise_level, water_quality). Attack modes: anomaly_burst (out-of-range values), data_tampering |
| `services/simulators/network_emulator/` | Generates network connection events. Attack modes: port_scan (SYN scan), dos, brute_force (SSH/RDP/FTP) |

### Frontend

| File | Responsibility |
|------|---------------|
| `src/App.tsx` | Root component. Manages auth state (isAuthenticated, user), active attack tracking, route definitions with ProtectedRoute wrapping, AnimatePresence page transitions |
| `src/hooks/useAssetStream.ts` | WebSocket hook. Connects to `/ws/city-telemetry`, handles auto-reconnect (3s), heartbeat (30s ping/pong), message parsing for `asset_update` and `attack_path` events. Maps backend schema to frontend interfaces |
| `src/components/smartcity/CityScene.tsx` | Three.js canvas setup. PerspectiveCamera (FOV 45), ambient + directional lighting, OrbitControls with damping, EffectComposer for bloom/vignette post-processing |
| `src/components/smartcity/CyberpunkBuilding.tsx` | Procedural building meshes. Window grid textures, status-based coloring, emissive glow for critical buildings, animated attack effects (scale pulse, point light, ground ring) |
| `src/components/smartcity/AttackPathVisualizer.tsx` | Animated attack flow visualization. Uses CatmullRomCurve3 for spline paths, TubeGeometry for flow lines, particle clouds that move along paths at configurable speeds, per-frame updates via useFrame |
| `src/components/smartcity/materials.ts` | Material definitions and color constants. STATUS_COLORS (ok=cyan, warning=amber, critical=pink, offline=gray), CATEGORY_COLORS per zone, glass material with MeshPhysicalMaterial (transmission 0.3) |
| `src/pages/Alerts.tsx` | Alert investigation interface. Three-tab layout (Analysis, Actions, Related Events). Action execution with confirmation dialog, execution details modal with playbook stdout/stderr |
| `src/components/Nav.tsx` | Fixed sidebar navigation (260px). Role-based menu filtering, active route highlighting, active attack status indicator, glassmorphism effect |

---

## 9. Setup & Installation

### Prerequisites

- **Docker Desktop** 4.x+ with Docker Compose 2.x+
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 20GB free space
- **Linux only**: `sudo sysctl -w vm.max_map_count=262144` (required for OpenSearch)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/SamiAhmedQMUL/CityShield.git
cd CityShield

# 2. Bootstrap (creates .env, starts OpenSearch, creates indices)
./scripts/bootstrap.sh

# 3. Start all 16 services
docker compose up -d --build

# 4. Wait 2-3 minutes for all services to become healthy
docker compose ps

# 5. Access the platform
# Frontend UI:           http://localhost:3000
# Backend API + Swagger: http://localhost:8000/docs
# OpenSearch Dashboards: http://localhost:5601
```

### Default Credentials

| Account | Username | Password | Role |
|---------|----------|----------|------|
| Administrator | `admin` | `CityShield@Admin2026` | Full access |
| Researcher | `researcher` | `CityShield@Researcher2026` | Scenarios + rules |

Both are auto-seeded on first startup and configurable via environment variables.

### Environment Variables

Copy `.env.example` to `.env` (bootstrap.sh does this automatically). Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENSEARCH_URL` | `http://opensearch:9200` | OpenSearch connection |
| `OPENSEARCH_USER` | `admin` | OpenSearch credentials |
| `OPENSEARCH_PASS` | `Admin@123!Change` | OpenSearch credentials |
| `BACKEND_JWT_SECRET` | (must change) | JWT signing key (HS256, min 32 chars) |
| `BACKEND_ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime |
| `DEFAULT_ADMIN_USER` / `_PASS` | `admin` / `CityShield@Admin2026` | Auto-seeded admin |
| `DEFAULT_RESEARCHER_USER` / `_PASS` | `researcher` / `CityShield@Researcher2026` | Auto-seeded researcher |
| `THREAT_INTEL_PROVIDER` | `mock` | `mock` or `abuseipdb` |
| `ABUSEIPDB_API_KEY` | (optional) | Required if provider=abuseipdb |
| `USE_MOCK_CITY_COMPONENTS` | `true` | Deterministic demo data |
| `TRAFFIC_SIM_EVENT_RATE` | `2` | Events/sec for traffic simulator |
| `IOT_SIM_EVENT_RATE` | `3` | Events/sec for IoT simulator |
| `NETWORK_EMULATOR_EVENT_RATE` | `1` | Events/sec for network emulator |
| `DETECTION_POLL_INTERVAL_SECONDS` | `30` | Detection engine poll frequency |
| `DETECTION_QUERY_WINDOW_SECONDS` | `300` | Rule evaluation lookback window |
| `RESPONSE_POLL_INTERVAL_SECONDS` | `30` | Response manager poll frequency |
| `RESPONSE_ENABLED` | `true` | Enable/disable automated response |

### Development (Without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt

# Requires running OpenSearch on localhost:9200
export OPENSEARCH_URL=http://localhost:9200
export OPENSEARCH_USER=admin
export OPENSEARCH_PASS=admin
export BACKEND_JWT_SECRET=dev-secret-key-min-32-characters-long
export DEFAULT_ADMIN_USER=admin
export DEFAULT_ADMIN_PASS=admin

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev    # Dev server on :3000, proxies /api and /ws to :8000
```

**Running Tests:**
```bash
# Backend (requires OpenSearch running)
cd backend
pytest                                    # All tests
pytest tests/test_security.py             # Single file
pytest tests/test_security.py::test_jwt_creation  # Single test

# Linting
cd backend && ruff check app/
cd frontend && npm run lint

# Frontend build (includes TypeScript check)
cd frontend && npm run build
```

### Verification

```bash
# All containers healthy
docker compose ps

# Backend API
curl -s http://localhost:8000/api/health | python3 -m json.tool

# OpenSearch
curl -s http://localhost:9200/_cluster/health | python3 -m json.tool

# Frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# Cyber range connectivity
docker exec -it attacker ping -c 2 metasploitable
```

---

## 10. API Documentation

Full Swagger documentation is available at `http://localhost:8000/docs` when the backend is running.

### Authentication

| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | `/api/auth/login` | `{ username, password }` | `{ access_token }` | None |
| GET | `/api/auth/me` | - | `{ username, role, email }` | Bearer token |

All other endpoints require `Authorization: Bearer <token>` header.

### Alerts

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/alerts` | List alerts (filterable by severity, status, rule_id, component, city_zone) | Any |
| GET | `/api/alerts/stats/summary` | Aggregated alert statistics | Any |
| GET | `/api/alerts/{alert_id}` | Single alert details | Any |
| GET | `/api/alerts/{alert_id}/analysis` | MITRE ATT&CK analysis + remediation | Any |
| GET | `/api/alerts/{alert_id}/replay-events` | Event timeline (5-min window around trigger) | Any |
| PUT | `/api/alerts/{alert_id}` | Update alert (status, enrichment, response) | Analyst/Admin |

### Detection Rules

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/rules` | Create detection rule | Researcher/Admin |
| GET | `/api/rules` | List rules (optional `enabled_only` filter) | Any |
| GET | `/api/rules/{rule_id}` | Single rule details | Any |
| PUT | `/api/rules/{rule_id}` | Update rule | Researcher/Admin |
| DELETE | `/api/rules/{rule_id}` | Delete rule | Researcher/Admin |
| PUT | `/api/rules/{rule_id}/auto-response` | Configure auto-response settings | Researcher/Admin |

### Scenarios

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/scenarios` | Create scenario | Researcher/Admin |
| GET | `/api/scenarios` | List all scenarios | Any |
| GET | `/api/scenarios/{scenario_id}` | Single scenario | Any |
| GET | `/api/scenarios/attack-techniques` | List 31 MITRE techniques with parameters | Any |
| PUT | `/api/scenarios/{scenario_id}` | Update scenario | Researcher/Admin |
| DELETE | `/api/scenarios/{scenario_id}` | Delete scenario | Researcher/Admin |
| POST | `/api/scenarios/runs` | Execute scenario (creates background task) | Researcher/Admin |
| GET | `/api/scenarios/runs` | List scenario runs | Any |
| GET | `/api/scenarios/runs/{run_id}` | Single run details | Any |
| GET | `/api/scenarios/runs/{run_id}/stages` | Real-time stage progress | Any |
| POST | `/api/scenarios/custom` | Execute custom attack chain | Researcher/Admin |

### Actions & Audit

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/actions` | List available response actions | Any |
| POST | `/api/actions/execute/{alert_id}` | Execute manual response action | Analyst/Admin |
| GET | `/api/actions/audit` | Query audit log (filters: alert_id, rule_id, action_name, execution_type, status, date range) | Any |
| GET | `/api/actions/audit/{audit_id}` | Specific audit entry details | Any |
| GET | `/api/actions/alert/{alert_id}/history` | All actions for an alert | Any |
| GET | `/api/actions/rule/{rule_id}/history` | Auto-response history for a rule | Any |

### Proposals

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/proposals` | Submit attack proposal | Researcher/Admin |
| GET | `/api/proposals` | List proposals (filtered by role) | Any |
| PUT | `/api/proposals/{id}/review` | Approve or reject proposal | Admin |

### Other Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/overview/*` | Dashboard statistics |
| GET | `/api/devices` | Device inventory |
| PUT | `/api/devices/{id}/power` | Toggle device power (Admin) |
| GET | `/api/logs/*` | Raw log querying |
| GET | `/api/metrics/*` | MTTD/MTTR metrics |
| GET/POST | `/api/users/*` | User CRUD (Admin) |
| GET/POST | `/api/lab/*` | Research lab provisioning |
| GET | `/api/mitre/techniques` | MITRE ATT&CK technique catalog (supports `?search=` and `?tactic=`) |
| WS | `/ws/city-telemetry` | Real-time asset + attack path stream |

### WebSocket Protocol

Connect: `ws://localhost:8000/ws/city-telemetry?token=<JWT>`

**Server Messages:**

```json
// Asset state updates (every 2s)
{
  "type": "asset_update",
  "assets": [
    {
      "asset_id": "traffic-controller-01",
      "status": "active",
      "metrics": { "events_1h": 142, "alerts_open": 2 },
      "zone": "traffic-management"
    }
  ]
}

// Attack path visualization
{
  "type": "attack_path",
  "path": {
    "source": "attacker-01",
    "target": "traffic-controller-01",
    "visual": { "color": "#ff003c", "speed": 1.5 }
  }
}

// Heartbeat response
{ "type": "pong" }
```

**Client Messages:**
```json
// Heartbeat (every 30s)
"ping"
```

---

## 11. Database Design

CityShield uses **OpenSearch 2.11** as its sole data store (no traditional RDBMS). All data is stored in OpenSearch indices with explicit field mappings.

### Index Schema

#### `users`

| Field | Type | Purpose |
|-------|------|---------|
| `username` | keyword | Unique identifier |
| `hashed_password` | keyword | bcrypt hash |
| `role` | keyword | Administrator / Analyst / Researcher |
| `email` | keyword | User email |
| `is_active` | boolean | Account status |
| `created_at` | date | Account creation time |

#### `logs-traffic`, `logs-iot`, `logs-network`

| Field | Type | Purpose |
|-------|------|---------|
| `@timestamp` | date | Event time |
| `component` | text+keyword | Source system (traffic_management, iot_sensors, network_infrastructure) |
| `event_type` | text+keyword | Event category (vehicle_movement, sensor_reading, network_connection, auth_failure, port_scan, etc.) |
| `severity` | keyword | low / medium / high / critical |
| `city_zone` | text+keyword | Smart city zone |
| `src_ip` | ip | Source IP address |
| `dst_ip` | ip | Destination IP address |
| `src_port` | integer | Source port |
| `dst_port` | integer | Destination port |
| `actor_id` | text+keyword | Entity performing action |
| `asset_id` | text+keyword | Target asset |
| `sensor_id` | text+keyword | IoT sensor identifier |
| `message` | text | Human-readable description |
| `metadata` | object | Event-specific data (speed, vehicle_type, bytes_sent, protocol, etc.) |
| `is_attack` | boolean | Whether event is attack traffic |
| `correlation_id` | keyword | Links events to scenario runs |

#### `alerts`

| Field | Type | Purpose |
|-------|------|---------|
| `alert_id` | keyword | UUID |
| `triggered_at` | date | When rule fired |
| `rule_id` | keyword | Detection rule that fired |
| `rule_name` | text | Human-readable rule name |
| `severity` | keyword | low / medium / high / critical |
| `component` | text+keyword | Affected system |
| `city_zone` | text+keyword | Affected zone |
| `technique_id` | keyword | MITRE ATT&CK technique ID |
| `technique_name` | text | MITRE technique name |
| `evidence` | object | Matched data (src_ip, dst_ports, counts, etc.) |
| `enrichment` | object | Threat intel data (reputation score, country, ISP) |
| `status` | keyword | open / acknowledged / resolved / closed |
| `response` | object | Response actions taken (status, actions array) |

#### `rules`

| Field | Type | Purpose |
|-------|------|---------|
| `rule_id` | keyword | Unique identifier |
| `name` | text | Rule name |
| `description` | text | What threat is detected |
| `enabled` | boolean | Active/inactive |
| `severity` | keyword | Alert severity when triggered |
| `query_window_seconds` | integer | Evaluation lookback window |
| `match_logic` | object | `{ type, parameters: { threshold, group_by, event_types, min_sources } }` |
| `technique_id` | keyword | MITRE ATT&CK ID |
| `technique_name` | text | MITRE technique name |
| `response_actions` | keyword[] | Actions to execute (block_ip, isolate_service, revoke_token) |
| `log_sources` | keyword[] | Indices to query (logs-traffic, logs-iot, logs-network) |
| `false_positive_notes` | text | Tuning guidance |
| `auto_response_config` | object | `{ enabled, minimum_severity, require_enrichment, max_executions_per_hour }` |

#### `scenarios`

| Field | Type | Purpose |
|-------|------|---------|
| `scenario_id` | keyword | Unique identifier |
| `name` | text | Scenario name |
| `description` | text | Scenario description |
| `attack_pattern` | keyword | Brute Force / DDoS / Port Scan / Ransomware / etc. |
| `components` | keyword[] | Target components |
| `duration_seconds` | integer | Expected duration |
| `mitre_technique_ids` | keyword[] | Associated MITRE techniques |
| `created_by` | keyword | Author username |

#### `scenario_runs`

| Field | Type | Purpose |
|-------|------|---------|
| `run_id` | keyword | UUID |
| `scenario_id` | keyword | Parent scenario |
| `status` | keyword | pending / running / completed / failed |
| `started_at` | date | Execution start |
| `completed_at` | date | Execution end |
| `target_device_id` | keyword | Target device |
| `stages` | nested | `[{ name, status, started_at, completed_at, events_generated }]` |
| `results` | object | `{ events_generated, alerts_triggered, detection_rate, detection_gaps }` |

#### `action-audit-log`

| Field | Type | Purpose |
|-------|------|---------|
| `audit_id` | keyword | UUID |
| `alert_id` | keyword | Triggering alert |
| `rule_id` | keyword | Associated rule |
| `action_name` | keyword | block_ip / isolate_service / revoke_token |
| `execution_type` | keyword | manual / automated |
| `triggered_by` | keyword | Username or "system" |
| `status` | keyword | pending / success / failed |
| `parameters` | object | Action-specific vars (ip_address, service_name, user_id) |
| `playbook_path` | keyword | Ansible playbook executed |
| `stdout` | text | Playbook stdout output |
| `stderr` | text | Playbook stderr output |
| `started_at` | date | Execution start |
| `completed_at` | date | Execution end |
| `error` | text | Error message if failed |

#### `city-assets`

| Field | Type | Purpose |
|-------|------|---------|
| `asset_id` | keyword | Unique identifier |
| `name` | text | Display name |
| `asset_type` | keyword | Device type (traffic_controller, sensor, firewall, etc.) |
| `status` | keyword | active / inactive / maintenance |
| `criticality` | keyword | low / medium / high / critical |
| `zone` | keyword | City zone placement |
| `network` | object | `{ ip, mac, subnet }` |
| `detection_rules` | keyword[] | Applicable rule IDs |
| `lifecycle_state` | keyword | operational / decommissioned |
| `tags` | keyword[] | Classification tags |

#### `attack-proposals`

| Field | Type | Purpose |
|-------|------|---------|
| `proposal_id` | keyword | UUID |
| `title` | text | Proposal title |
| `description` | text | Attack description |
| `target_component` | keyword | Target system |
| `attack_pattern` | keyword | Attack type |
| `technique_ids` | keyword[] | MITRE technique IDs |
| `status` | keyword | pending / approved / rejected |
| `submitted_by` | keyword | Researcher username |
| `reviewed_by` | keyword | Admin username |
| `review_comment` | text | Admin feedback |

#### `blocked_ips`

| Field | Type | Purpose |
|-------|------|---------|
| `ip_address` | ip | Blocked IP |
| `blocked_at` | date | Block timestamp |
| `alert_id` | keyword | Triggering alert |
| `reason` | text | Block reason |

### Relationships

OpenSearch is a document store without foreign keys. Relationships are maintained by convention through shared identifiers:

```
users.username ─────── scenarios.created_by
                    ── attack-proposals.submitted_by
                    ── action-audit-log.triggered_by

rules.rule_id ─────── alerts.rule_id
                    ── action-audit-log.rule_id

alerts.alert_id ────── action-audit-log.alert_id

scenarios.scenario_id ── scenario_runs.scenario_id

scenario_runs.run_id ── logs-*.correlation_id  (event tracing)
```

---

## 12. Challenges & Solutions

### 1. Real-Time Attack Detection Without False Positives

**Challenge**: Detection rules must fire on genuine attack traffic generated by scenarios but not on normal simulator traffic, despite both flowing through the same `logs-*` indices.

**Solution**: The rule engine uses OpenSearch aggregation queries with field-specific thresholds. For example, `brute_force_001` aggregates `auth_failure` events per `src_ip.keyword` over a 300-second window. Attack traffic naturally exceeds thresholds (50+ failures from one IP) while normal traffic stays below (0-1 per IP). Each rule's `false_positive_notes` documents known benign triggers for tuning.

### 2. OpenSearch Text vs. Keyword Fields for Aggregations

**Challenge**: OpenSearch text fields are analyzed (tokenized) and cannot be used in term aggregations. The detection engine needs to aggregate by exact field values (e.g., IP addresses, event types), but the simulator events write text fields.

**Solution**: `rule_runtime.py` maintains a `KEYWORD_FIELDS` set and automatically appends `.keyword` suffix to text fields in aggregation queries. The index template created by the detection engine defines dual-mapped fields (text with keyword sub-field) so both full-text search and exact aggregations work.

### 3. Coordinating Async Attack Stages with Real-Time UI Updates

**Challenge**: Attack scenarios execute over 30-120+ seconds across 4 stages. The frontend needs to display real-time stage progress, but the backend runs attacks as async background tasks.

**Solution**: The backend writes stage status updates to the `scenario_runs` OpenSearch document after each stage completes. The frontend polls `GET /api/scenarios/runs/{run_id}/stages` on a fast interval during active attacks. Each stage has discrete fields (`status`, `started_at`, `completed_at`, `events_generated`) enabling precise progress visualization.

### 4. Network Isolation for Training Targets

**Challenge**: Training targets (Metasploitable, IoT hub) must be accessible to the research lab and attacker containers but must not have internet access or reach production services directly.

**Solution**: Docker Compose defines three networks with `internal: true` on range networks, preventing internet access. The research lab container connects to all three networks simultaneously, enabling it to reach both isolated targets while also communicating with the backend API. The `range_logger` bridges the gap by connecting to both `cyber_range_net` (for packet capture) and `cityshield_network` (for log shipping).

### 5. Preventing Auto-Response Runaway Loops

**Challenge**: An alert storm (e.g., from a large DDoS scenario generating hundreds of events) could trigger unlimited automated playbook executions, overwhelming the system.

**Solution**: Three-layer protection: (1) Per-rule `max_executions_per_hour` rate limit, enforced by querying `action-audit-log` for recent executions before each action; (2) Configurable `minimum_severity` threshold prevents low-priority alerts from triggering automation; (3) Optional `require_enrichment` flag ensures only threat-intel-validated alerts trigger responses.

### 6. 3D Visualization Performance with Real-Time Data

**Challenge**: Rendering 25+ animated 3D buildings with real-time WebSocket updates, post-processing effects (bloom, vignette), and attack path particle systems while maintaining 60fps.

**Solution**: The frontend uses several optimization strategies: instanced materials shared across buildings via `materials.ts`, device pixel ratio capping on the Canvas, damped orbit controls to reduce re-renders, `useFrame` hooks that only update animated elements (attack pulses, particles) each frame rather than re-rendering the full scene, and conditional post-processing (bloom only on emissive surfaces).

### 7. Stateless Backend with Docker-Managed Labs

**Challenge**: The backend must provision per-user Docker containers for the research lab, but the FastAPI application is designed to be stateless (all data in OpenSearch).

**Solution**: `lab_service.py` uses the Docker socket (`/var/run/docker.sock`) mounted into the backend container to directly interact with the Docker daemon. Container names follow a convention (`cityshield-lab-{username}`) enabling the backend to find existing containers without maintaining local state. Lab container volumes persist user data between restarts.

### 8. Cross-Service Event Correlation

**Challenge**: Events from attack scenarios flow through simulators, get indexed, are evaluated by the detection engine, generate alerts, and trigger response actions. Tracing this chain across services is difficult without a shared identifier.

**Solution**: The attack execution engine tags every event with a `correlation_id` equal to the `run_id` of the scenario. This ID propagates through the entire pipeline: from `logs-*` events to `alerts` (via evidence matching) to `action-audit-log` entries (via `alert_id`). The frontend uses this chain for the event replay timeline feature.

---

## 13. Future Improvements

### Detection & Response

- **Machine Learning Detection** — Supplement rule-based detection with anomaly detection models trained on simulator data (baseline normal behavior, detect deviations)
- **YARA/Sigma Rule Support** — Import industry-standard Sigma rules alongside the custom YAML format, enabling use of community rule sets
- **Playbook Chaining** — Support multi-step response workflows (e.g., block IP then isolate service then notify SOC), with conditional logic based on enrichment data
- **Real Firewall Integration** — Replace simulated Ansible playbooks with actual iptables/firewall API calls for production deployments

### Platform Capabilities

- **Multi-Tenant Support** — Isolated environments per team/organization with separate OpenSearch indices, enabling classroom/training deployments
- **Scenario Scoring** — Quantitative assessment of analyst performance during scenarios (time-to-detect, correct actions taken, false positive rate)
- **Replay Mode** — Record full scenario executions and replay them for training review, with step-by-step analysis
- **Additional Training Targets** — Add more vulnerable services (web applications with OWASP vulnerabilities, Active Directory environments, cloud infrastructure simulators)

### Infrastructure

- **Horizontal Scaling** — Scale detection engine and response manager with multiple replicas, partitioned by rule groups or alert queues
- **Index Lifecycle Management** — Automated log rotation, archival, and deletion policies for OpenSearch indices to manage disk usage
- **Kubernetes Migration** — Move from Docker Compose to Kubernetes for production-grade orchestration, auto-scaling, and rolling updates
- **TLS Everywhere** — Enable HTTPS on frontend, mutual TLS between backend services, and OpenSearch security plugin with certificate-based authentication

### User Experience

- **Collaborative Investigation** — Shared alert investigation sessions where multiple analysts can annotate, discuss, and coordinate response
- **Customizable 3D City Layout** — Allow users to define custom city zones, add buildings, and configure the 3D scene to match their organization's infrastructure
- **Mobile-Responsive UI** — Optimize the dashboard for tablet/mobile use in field training scenarios
- **Notification System** — Real-time push notifications (WebSocket or browser notifications) for critical alerts, scenario completions, and proposal reviews

### Data & Analytics

- **SIEM Integration** — Export alerts and logs to external SIEMs (Splunk, QRadar, Sentinel) via syslog or API forwarding
- **Report Generation** — Automated PDF/HTML reports summarizing scenario results, detection metrics, and training progress
- **Dataset Export** — One-click export of labeled attack datasets (events + ground truth labels) for ML research
- **Historical Analytics** — Trend analysis dashboards showing detection improvement over time across scenario runs
