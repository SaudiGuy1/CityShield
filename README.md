# CityShield Platform

**Simulating and Defending Smart City Cyberattacks**

CityShield is a secure, scalable, interactive smart city cyber range for training, testing, and evaluating cybersecurity defenses. It deploys modular smart-city domain microservices, simulates realistic cyber-attack scenarios, provides centralized logging and monitoring, detects threats using rule-based detection aligned to MITRE ATT&CK, integrates live threat intelligence enrichment, and executes automated response playbooks with subnet-aware whitelisting.

## Features

- **Modular Simulation Layer**: Traffic management, IoT sensors, and network emulator services that generate realistic event streams
- **Cyber Range**: Isolated attack/defense lab with a real Metasploitable target and Kali-based attacker container, with live packet capture via `range_logger`
- **IoT Range**: Isolated IoT sensor hub training target with HTTP management interface and MQTT-like listener, reachable from the Research Lab terminal
- **Centralized Logging**: Filebeat ships logs to OpenSearch; simulators also write directly to OpenSearch indices
- **Threat Detection**: 75 rule-based detection rules covering all 13 MITRE ATT&CK tactics with optional threat intelligence enrichment (AbuseIPDB)
- **MITRE ATT&CK Integration**: 75 techniques across 13 tactics (Reconnaissance, Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration, Impact), available as configurable attack techniques in the Custom Scenario Builder
- **OWASP Top 10 Scenarios**: 10 built-in OWASP-aligned training scenarios (A01-A10:2021) that generate simulated attack traffic
- **Automated Response System**: 12 response actions executed via Ansible playbooks, with per-rule auto-response configuration including severity thresholds, rate limiting, cooldown periods, enrichment requirements, human confirmation gates, action allow-lists, and subnet whitelisting for auto-resolution
- **Subnet Whitelisting**: Configure trusted subnets (e.g., researcher lab, cyber range) per detection rule — alerts originating from whitelisted IPs are suppressed at the detection engine and auto-resolved by the response manager
- **Interactive 3D City Visualization**: Real-time 3D smart city powered by Three.js / React Three Fiber with 6 zones (Traffic, IoT, Network, Security, Industrial, Cyber Range), orbit controls, hover/click interactions, and live data-driven building states
- **Live Attack Visualization**: When a scenario runs, the 3D map shows real-time attack progress — only the targeted district's buildings pulse red with dramatic effects (scale pulsing, red point light, rotating ground ring). Non-targeted buildings remain normal
- **Real-Time Alert Pipeline**: Alerts are generated in real-time as attack stages complete, with accelerated polling (2s) during active attacks and an "Attack in Progress" banner on the Alerts page
- **Attack Scenario Engine**: 21+ built-in scenarios (including 10 OWASP) with real-time stage progression, 4-stage execution per scenario, and live progress tracking in the UI
- **Attack Proposals**: Researchers submit attack proposals for admin approval before they become executable scenarios
- **Interactive Web UI**: React-based dashboard for monitoring, alert investigation, scenario management, rule configuration, and MITRE technique reference
- **Device Power Control**: Administrators can toggle devices on/off from the Device Management page or the 3D Asset Inspector, with real-time visual feedback in the 3D city
- **Employee Cybersecurity Awareness Training Module**: Interactive security training portal (`/awareness`) with phishing, passwords, data protection, and incident reporting modules plus a 5-question knowledge check with pass/fail scoring
- **Role-Based Access Control**: Four roles — Administrator, Analyst, Researcher, and Viewer — with granular permissions
- **Evaluation Metrics**: MTTD, MTTR, detection accuracy, false positive rate, and resource utilization tracking
- **Research Lab**: Per-user Ubuntu container with pre-installed security tools (nmap, hydra, nikto, netcat, tcpdump), connected to all three Docker networks for direct access to training targets

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React 18 + TypeScript + Vite)  │
│  Dashboard │ 3D City │ Alerts │ Rules │ Scenarios │ Devices    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                Backend API (FastAPI + JWT/HS256 + RBAC)          │
│  Auth │ Users │ Rules │ Scenarios │ Alerts │ Actions │ Lab │ WS │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                Data Layer (OpenSearch 2.11 + Dashboards)         │
│  logs-traffic │ logs-iot │ logs-network │ alerts │ rules │       │
│  scenarios │ scenario_runs │ users │ city-assets │ action-audit  │
│  attack-proposals │ blocked_ips                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ├──────────────────┬─────────────────┬──────────────────┐
           ▼                  ▼                 ▼                  ▼
    ┌────────────┐     ┌────────────┐    ┌──────────┐    ┌──────────────┐
    │ Detection  │     │  Response  │    │ Scenario │    │   Filebeat   │
    │  Engine    │     │  Manager   │    │  Runner  │    │ Log Shipper  │
    │ (75 rules) │     │(12 actions)│    │          │    │              │
    └────────────┘     └────────────┘    └──────────┘    └──────┬───────┘
                                                                 │
           ┌─────────────────────────────────────────────────────┘
           │
           ├────────────────┬────────────────┐
           ▼                ▼                ▼
    ┌────────────┐   ┌────────────┐   ┌──────────────┐
    │  Traffic   │   │    IoT     │   │   Network    │
    │ Simulator  │   │ Simulator  │   │  Emulator    │
    │  (:8001)   │   │  (:8002)   │   │  (:8003)     │
    └────────────┘   └────────────┘   └──────────────┘

    ┌──────── Cyber Range (172.20.0.0/16, isolated) ───┐
    │  ┌──────────┐   ┌───────────────┐                │
    │  │ Attacker │──▶│ Metasploitable│                │
    │  │  (Kali)  │   │  (Target)     │                │
    │  │ .20.0.3  │   │  .20.0.2      │                │
    │  └──────────┘   └───────────────┘                │
    │       ▲ tcpdump                                   │
    │  ┌──────────┐                                     │
    │  │  Range   │──▶ Filebeat ──▶ OpenSearch          │
    │  │  Logger  │                                     │
    │  └──────────┘                                     │
    └───────────────────────────────────────────────────┘

    ┌──────── IoT Range (172.21.0.0/16, isolated) ─────┐
    │  ┌────────────────┐                               │
    │  │   IoT Target   │  HTTP :8080 + TCP :1883       │
    │  │  (Sensor Hub)  │  .21.0.2                      │
    │  └────────────────┘                               │
    │       ▲ tcpdump                                   │
    │  ┌──────────────┐                                 │
    │  │ IoT Range    │──▶ Filebeat ──▶ OpenSearch      │
    │  │   Logger     │                                 │
    │  └──────────────┘                                 │
    └───────────────────────────────────────────────────┘
```

### Docker Networks

| Network | Subnet | Purpose |
|---|---|---|
| `cityshield_network` | 172.22.0.0/16 | Main bridge network for all services |
| `cyber_range_net` | 172.20.0.0/16 | Isolated network for Metasploitable, attacker, range_logger |
| `iot_range_net` | 172.21.0.0/16 | Isolated network for IoT target + logger |

### Data Flow

1. **Simulators** generate JSON events → written to OpenSearch `logs-*` indices (and JSONL files on shared volume)
2. **Detection engine** polls `logs-*` every 30s → matches against 75 YAML rules → checks subnet whitelists → writes `alerts` documents (non-whitelisted only)
3. **Response manager** polls `alerts` every 30s → checks auto-response config → validates conditions (severity, enrichment, rate limits, whitelists) → executes Ansible playbooks → creates audit entries in `action-audit-log` → resolves alerts
4. **Frontend** fetches via REST (`/api/*`) and receives real-time updates via WebSocket (`/ws/city-telemetry`)
5. **Manual actions**: User triggers action from Alerts UI → backend queues in `action-audit-log` → response manager executes → updates audit entry with results

## Prerequisites

- Docker Desktop 4.x or later with Docker Compose 2.x+
- 8 GB RAM minimum (16 GB recommended)
- 20 GB free disk space
- **Linux only**: `sudo sysctl -w vm.max_map_count=262144` (not needed on macOS/Windows Docker Desktop)

## Quick Start

### 1. Clone, Bootstrap, and Start

```bash
git clone https://github.com/SamiAhmedQMUL/CityShield.git
cd CityShield

# Bootstrap: copies .env.example → .env, starts OpenSearch, creates indices
./scripts/bootstrap.sh

# Start all services
docker compose up -d --build
```

Wait 2-3 minutes for all services to become healthy.

### 2. Service Ports

| Service | Port | Purpose |
|---|---|---|
| `frontend` | 3000 | React UI (nginx in production, Vite dev server proxies `/api` and `/ws` to `:8000`) |
| `backend` | 8000 | FastAPI REST API + Swagger docs at `/docs` + WebSocket at `/ws/city-telemetry` |
| `opensearch` | 9200 | Data store (OpenSearch 2.11) |
| `dashboards` | 5601 | OpenSearch Dashboards |
| `traffic_sim` | 8001 | Traffic event simulator (FastAPI) |
| `iot_sim` | 8002 | IoT event simulator (FastAPI) |
| `network_emulator` | 8003 | Network event simulator (FastAPI) |
| `detection_engine` | — | Polls `logs-*`, evaluates 75 rules, writes alerts |
| `response_manager` | — | Polls `alerts`, executes 12 Ansible response playbooks |
| `scenario_runner` | — | Polls `scenario_runs`, sends commands to simulators |
| `filebeat` | — | Ships JSONL logs from shared volume to OpenSearch |
| `metasploitable` | — | Vulnerable training target (172.20.0.2) |
| `attacker` | — | Kali Linux attack container (172.20.0.3) |
| `range_logger` | — | Cyber range packet capture (172.20.0.4) |
| `iot_target` | — | IoT sensor hub (172.21.0.2, HTTP :8080 + TCP :1883) |
| `iot_range_logger` | — | IoT range packet capture (172.21.0.3) |

### 3. Access the Platform

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **OpenSearch Dashboards**: http://localhost:5601

**Default Login Credentials:**

| Account | Username | Password | Role |
|---|---|---|---|
| Administrator | `admin` | `CityShield@Admin2026` | Full platform access |
| Researcher | `researcher` | `CityShield@Researcher2026` | Scenarios, proposals, research lab |

Both accounts are seeded automatically on first startup (idempotent). Credentials are configured via `DEFAULT_ADMIN_*` / `DEFAULT_RESEARCHER_*` in `.env`.

**IMPORTANT**: Change the default passwords and `BACKEND_JWT_SECRET` immediately after first login!

### 4. Verify the Platform

```bash
docker compose ps                                                    # All containers running
curl -s http://localhost:8000/api/health | python3 -m json.tool      # Backend health
curl -s http://localhost:9200/_cluster/health | python3 -m json.tool # OpenSearch health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000         # Frontend serves
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Administrator** | Manage users, system configuration, toggle device power, approve/reject attack proposals, configure auto-response, view all resources |
| **Analyst** | View alerts and logs, investigate incidents, update alert status, execute manual response actions |
| **Researcher** | Create scenarios, submit attack proposals, manage detection rules, configure auto-response, run simulations, manage research lab |
| **Viewer** | Read-only access to dashboards, alerts, rules, and logs |

## Detection Rules

CityShield includes **75 detection rules** covering all **13 MITRE ATT&CK tactics** with **100% technique coverage** across 75 techniques. Rules are defined as YAML files in `services/detection_engine/rules/` and seeded into OpenSearch on backend startup.

### MITRE ATT&CK Tactic Coverage

| Tactic | Rules | Example Techniques |
|---|---|---|
| **Reconnaissance** | 4 | T1595 Active Scanning, T1592 Gather Host Info, T1589 Gather Identity Info, T1590 Gather Network Info |
| **Initial Access** | 9 | T1190 Exploit Public-Facing App, T1566 Phishing, T1566.001 Spearphishing Attachment, T1078 Valid Accounts, T1195 Supply Chain Compromise |
| **Execution** | 8 | T1059 Command/Scripting Interpreter, T1059.001 PowerShell, T1053 Scheduled Task, T1569 System Services |
| **Persistence** | 7 | T1547 Boot Autostart, T1543 Modify System Process, T1136 Create Account, T1098 Account Manipulation |
| **Privilege Escalation** | 4 | T1548 Abuse Elevation Control, T1068 Exploitation for Priv Esc, T1055 Process Injection |
| **Defense Evasion** | 8 | T1562 Impair Defenses, T1070 Indicator Removal, T1027 Obfuscation, T1014 Rootkit, T1574.002 DLL Side-Loading |
| **Credential Access** | 7 | T1110 Brute Force, T1003 Credential Dumping, T1557 Adversary-in-the-Middle, T1558.003 Kerberoasting |
| **Discovery** | 4 | T1046 Network Service Scanning, T1082 System Info Discovery, T1083 File/Dir Discovery, T1135 Network Share Discovery |
| **Lateral Movement** | 4 | T1021 Remote Services, T1210 Remote Service Exploitation, T1563.001 SSH Hijacking, T1570 Lateral Tool Transfer |
| **Collection** | 6 | T1056 Input Capture, T1113 Screen Capture, T1115 Clipboard Data, T1119 Automated Collection, T1560 Archive Data |
| **Command and Control** | 4 | T1071 App Layer Protocol, T1572 Protocol Tunneling, T1105 Ingress Tool Transfer, T1205 Traffic Signaling |
| **Exfiltration** | 1 | T1041 Exfiltration Over C2 Channel |
| **Impact** | 9 | T1498 Network DoS, T1486 Ransomware, T1485 Data Destruction, T1495 Firmware Corruption, T1496 Resource Hijacking |

### Rule Match Logic Types

Each rule specifies a `match_logic.type` that determines how the detection engine evaluates it:

| Type | Description |
|---|---|
| `net_scan` | Network port scanning patterns |
| `brute_force` | Failed authentication attempts |
| `iot_anomaly` | IoT sensor anomalous readings |
| `c2_beacon` | Command-and-control beaconing patterns |
| `data_exfiltration` | Large outbound data transfers |
| `ddos_attack` | Distributed denial of service |
| `dos_endpoint` | Endpoint denial of service |
| `ransomware` | Encryption activity patterns |
| `web_exploit` | Web application exploitation |
| `lateral_movement` | Cross-host movement patterns |
| `credential_dump` | Credential dumping activity |
| `log_clearing` | Security log tampering |
| `cmd_execution` | Command/script execution |
| `account_creation` | Unauthorized account creation |
| `data_archiving` | Suspicious data archiving |
| `defense_evasion` | Security tool tampering |
| `obfuscation_detection` | Obfuscated file/traffic detection |
| `powershell_execution` | PowerShell abuse |
| `process_injection` | Process memory injection |
| `registry_persistence` | Registry-based persistence |
| `scheduled_task_creation` | Scheduled task persistence |
| `screen_capture` | Screen capture activity |
| `service_execution` | Service-based execution |
| `service_persistence` | Service-based persistence |
| `token_manipulation` | Access token manipulation |
| `event_threshold` | Generic event count threshold |

### Adding Custom Rules

Create a YAML file in `services/detection_engine/rules/`:

```yaml
rule_id: custom_rule_001
name: My Custom Rule
description: Detects suspicious activity
enabled: true
severity: high
query_window_seconds: 300
match_logic:
  type: event_threshold
  parameters:
    threshold: 5
    field: src_ip
    group_by: src_ip
    event_types:
      - suspicious_event
technique_id: T1046
technique_name: Network Service Scanning
response_actions:
  - block_ip
  - notify_soc
log_sources:
  - logs-network
false_positive_notes: |
  Legitimate scanning tools may trigger this rule.
```

Restart the detection engine to load new rules. To make them visible in the UI, also add the rule to `backend/app/data/detection_rules.json` and restart the backend (or re-run the YAML→JSON export).

## Response Actions

CityShield includes **12 automated response actions**, each backed by an Ansible playbook in `infrastructure/ansible/playbooks/`:

| Action | Playbook | Category | Description |
|---|---|---|---|
| `block_ip` | `block_ip.yml` | Network | Block malicious IP at firewall level |
| `isolate_service` | `isolate_service.yml` | Network | Isolate compromised service from the network |
| `quarantine_host` | `quarantine_host.yml` | Network | Move compromised host to quarantine VLAN |
| `rate_limit` | `rate_limit.yml` | Network | Apply rate limiting to suspicious traffic source |
| `network_segmentation` | `network_segmentation.yml` | Network | Apply micro-segmentation rules to isolate a zone |
| `revoke_token` | `revoke_token.yml` | Identity | Revoke user authentication token and force re-login |
| `disable_account` | `disable_account.yml` | Identity | Disable compromised user account |
| `reset_credentials` | `reset_credentials.yml` | Identity | Force password reset for compromised accounts |
| `kill_process` | `kill_process.yml` | Endpoint | Terminate malicious process on target host |
| `snapshot_forensics` | `snapshot_forensics.yml` | Forensics | Capture disk/memory snapshot for analysis |
| `notify_soc` | `notify_soc.yml` | Notification | Send SOC team notification via configured channels |
| `escalate_incident` | `escalate_incident.yml` | Notification | Escalate to incident response team and create ticket |

All playbooks are simulated for the cyber range environment (log actions, write to `/tmp/` audit files). In production, replace with real firewall/IAM/SIEM integrations.

## Auto-Response System

Each detection rule can have auto-response independently configured via the **Rules → Configure → Auto-Response** tab in the UI. The system provides:

### Configuration Options (per rule)

| Setting | Description | Default |
|---|---|---|
| **Enable/Disable** | Master toggle for automated response | Off |
| **Minimum Severity** | Only trigger for alerts ≥ this severity (low/medium/high/critical) | high |
| **Max Executions/Hour** | Rate limit to prevent runaway automation | 10 |
| **Cooldown Period** | Minimum minutes between responses for same alert source | 5 min |
| **Rate Limit Window** | Time window for counting max executions | 60 min |
| **Require Enrichment** | Only execute if alert has threat intelligence data | Off |
| **Notify SOC** | Send SOC notification when auto-response triggers | On |
| **Require Confirmation** | Queue actions for analyst approval before execution | Off |
| **Allowed Actions** | Restrict which response actions can auto-execute (default: all) | All |
| **Whitelisted Subnets** | CIDR subnets to auto-resolve (alerts from these IPs are suppressed) | None |

### Subnet Whitelisting

Whitelisted subnets cause alerts from matching source IPs to be:
1. **Suppressed** at the detection engine (no alert written to OpenSearch)
2. **Auto-resolved** by the response manager if an alert already exists (sets status to `resolved`)

Preset subnets available in the UI:

| Preset | CIDR | Purpose |
|---|---|---|
| CityShield Main Network | 172.22.0.0/16 | Platform services |
| Cyber Range Network | 172.20.0.0/16 | Penetration testing / training |
| IoT Range Network | 172.21.0.0/16 | IoT research / testing |
| Internal (10.x) | 10.0.0.0/8 | Private class A |
| Internal (192.168.x) | 192.168.0.0/16 | Private class C |

Custom IPs and CIDRs can also be added (bare IPs like `10.0.3.99` are automatically converted to `/32`).

### Auto-Response Pipeline

```
Alert created (detection engine)
    │
    ├── Is source IP in whitelisted subnet? ──▶ YES → Suppress (no alert written)
    │
    ▼ NO
Alert written to OpenSearch (status: open)
    │
    ▼
Response manager polls (every 30s)
    │
    ├── Whitelist check ──▶ Match → Auto-resolve alert (status: resolved)
    │
    ├── Auto-response enabled? ──▶ NO → Skip
    │
    ├── Severity ≥ minimum? ──▶ NO → Skip
    │
    ├── Enrichment required + present? ──▶ NO → Skip
    │
    ├── Rate limit within bounds? ──▶ NO → Skip
    │
    ▼ All conditions met
Execute response actions → Create audit entries → Resolve alert
```

## OpenSearch Indices

| Index | Purpose | Key Fields |
|---|---|---|
| `users` | User accounts | username, email, role, hashed_password, is_active |
| `rules` | Detection rules (seeded from YAML on startup) | rule_id, name, severity, match_logic, technique_id, response_actions, auto_response_config |
| `alerts` | Detected threats | alert_id, triggered_at, rule_id, severity, technique_id, evidence, status, enrichment, response |
| `scenarios` | Attack scenario definitions | scenario_id, name, components, attack_pattern, mitre_technique_ids, category |
| `scenario_runs` | Scenario execution history | run_id, scenario_id, status, started_at, stages, results |
| `city-assets` | Smart city infrastructure inventory | asset_id, name, asset_type, status, criticality, location.zone, network.ip_address, risk_score |
| `logs-traffic` | Traffic simulator events | @timestamp, event_type, src_ip, dst_ip, component, severity |
| `logs-iot` | IoT simulator events | @timestamp, event_type, sensor_id, asset_id, component |
| `logs-network` | Network emulator events | @timestamp, event_type, src_ip, dst_ip, src_port, dst_port |
| `action-audit-log` | Response action execution history | audit_id, alert_id, action_name, execution_type (manual/automated), triggered_by, status, playbook_path |
| `attack-proposals` | Researcher-submitted proposals | proposal_id, title, technique_ids, target_component, status (pending/approved/rejected) |
| `blocked_ips` | IP address blocklist | ip_address, blocked_at, alert_id, reason |

## OWASP Top 10 Scenarios

10 built-in OWASP-aligned scenarios (A01-A10:2021) are seeded on startup:

| Scenario | OWASP ID | MITRE Technique | Attack Pattern |
|---|---|---|---|
| Broken Access Control | A01:2021 | T1078 | Brute Force |
| Cryptographic Failures | A02:2021 | T1040 | Data Exfiltration |
| Injection | A03:2021 | T1190 | Port Scan |
| Insecure Design | A04:2021 | T1565 | Port Scan |
| Security Misconfiguration | A05:2021 | T1046 | Port Scan |
| Vulnerable Components | A06:2021 | T1190 | Port Scan |
| Authentication Failures | A07:2021 | T1110 | Brute Force |
| Integrity Failures | A08:2021 | T1565 | Malware |
| Logging Failures | A09:2021 | T1562 | Data Exfiltration |
| SSRF | A10:2021 | T1190 | Port Scan |

## Attack Proposals

Researchers submit attack proposals for Administrator approval:

1. Navigate to **Proposals** → **Submit Proposal**
2. Fill in title, description, target component, attack pattern, MITRE techniques
3. Proposal appears as **pending** for admin
4. Admin reviews and **Approves** (creates executable scenario) or **Rejects** (with comment)

## Backend API

15 route modules serving REST endpoints and WebSocket:

| Module | Prefix | Key Endpoints |
|---|---|---|
| `routes_auth` | `/api/auth` | `POST /login`, `GET /me` |
| `routes_users` | `/api/users` | CRUD user management (Admin) |
| `routes_rules` | `/api/rules` | CRUD rules, `PUT /{id}/auto-response` |
| `routes_alerts` | `/api/alerts` | List, get, update, `GET /{id}/analysis`, `GET /stats/summary` |
| `routes_actions` | `/api/actions` | `POST /execute/{alert_id}`, `GET /audit/{id}`, `GET /alert/{id}/history` |
| `routes_scenarios` | `/api/scenarios` | CRUD scenarios, `POST /runs`, `POST /custom`, `GET /attack-techniques` |
| `routes_devices` | `/api/devices` | Asset inventory, `PUT /{id}/action` (power control) |
| `routes_proposals` | `/api/proposals` | Submit, list, `PUT /{id}/review` |
| `routes_metrics` | `/api/metrics` | MTTD, MTTR, detection accuracy |
| `routes_logs` | `/api/logs` | `GET /count`, `GET /recent`, `GET /stats` |
| `routes_overview` | `/api/overview` | `GET /city-components`, `GET /stats` |
| `routes_mitre` | `/api/mitre` | `GET /techniques` (search + tactic filter) |
| `routes_lab` | `/api/lab` | `GET /status`, WebSocket terminal |
| `routes_health` | `/api` | `GET /health` |
| `routes_websocket` | `/ws` | `WS /city-telemetry` (real-time city data) |

Full Swagger documentation at http://localhost:8000/docs.

## Frontend

### Pages

| Path | Page | Access |
|---|---|---|
| `/` | Overview dashboard + 3D smart city visualization | All authenticated |
| `/alerts` | Alert investigation, analysis, response execution | All authenticated |
| `/rules` | Detection rules, MITRE coverage, auto-response config | All authenticated |
| `/scenarios` | Scenario builder + Research Lab tab | All authenticated |
| `/scenarios/custom` | Custom scenario builder with MITRE technique selection | All authenticated |
| `/devices` | Device management, status monitoring, power control | All authenticated |
| `/awareness` | Security awareness training + knowledge quiz | All authenticated |
| `/proposals` | Attack proposals (submit / review) | All authenticated |
| `/admin/users` | User management | Administrator only |
| `/login` | Authentication | Public |

### 3D Smart City Visualization

The Overview dashboard features an interactive 3D city where each building represents a smart city asset. Buildings are grouped into six zones:

| Zone | Color | Assets |
|---|---|---|
| Traffic Management | Red | Traffic controllers, cameras, signals |
| IoT Sensors | Green | Environmental, water, air quality sensors |
| Network Infrastructure | Blue | Firewalls, switches, DNS, VPN |
| Security Operations | Purple | SIEM, EDR, scanners, auth servers |
| Industrial Systems | Orange | SCADA, PLCs, turbines, grid controllers |
| Cyber Range | Orange-Red | Metasploitable VM (172.20.0.2) |

- **Building height** reflects risk score (derived from alert count)
- **Building color** reflects status: green (ok), amber (warning), red+glow (critical), gray (offline)
- **Attack visualization**: Targeted buildings flash red with pulsing effects, scale throb, red point light, rotating ground ring
- **HUD panels**: Events, Alerts, Assets, Detection, and System panels showing live statistics
- **Data source**: WebSocket stream from `city-assets` index (2s refresh) + REST polling fallback

### Key Frontend Dependencies

| Package | Purpose |
|---|---|
| `three` / `@react-three/fiber` / `@react-three/drei` | 3D rendering engine and React bindings |
| `@react-three/postprocessing` | Bloom/glow effects |
| `framer-motion` | Page transitions and attack panel animations |
| `animejs` | UI panel animations |

## Project Structure

```
CityShield/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── api/                # 15 route modules
│   │   ├── core/               # config.py, security.py (JWT/bcrypt), rbac.py
│   │   ├── data/               # mitre_techniques.json (75), detection_rules.json (75)
│   │   ├── db/                 # opensearch_client.py (index mappings)
│   │   ├── models/             # Pydantic models: alert, rule, scenario, user, action, proposal, device
│   │   ├── services/           # Business logic: action, attack_engine, device, lab, metrics, rule, scenario, proposal
│   │   └── utils/              # Logging configuration
│   ├── tests/                  # Pytest tests (requires OpenSearch)
│   └── requirements.txt
├── frontend/                   # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── pages/              # 11 page components
│   │   ├── components/         # SmartCityMap3D, ActionHistoryTable, HUD panels, etc.
│   │   ├── hooks/              # useAssetStream, useCityData
│   │   └── types/              # TypeScript type definitions
│   └── package.json
├── services/
│   ├── detection_engine/       # Python 3.11, polls logs-*, evaluates 75 YAML rules
│   │   ├── rules/              # 75 detection rule YAML files
│   │   ├── rule_runtime.py     # Rule evaluation engine (26 match logic types)
│   │   ├── alert_writer.py     # Writes alerts to OpenSearch
│   │   └── enrichment/         # Threat intel providers (mock + AbuseIPDB)
│   ├── response_manager/       # Python 3.11, polls alerts, executes Ansible playbooks
│   │   ├── executor.py         # ResponseExecutor (12 action variable mappings)
│   │   └── playbooks_map.yml   # Action → playbook mapping (12 actions)
│   ├── scenario_runner/        # Python 3.11, polls scenario_runs, orchestrates simulators
│   ├── simulators/
│   │   ├── traffic_sim/        # FastAPI :8001, generates traffic events
│   │   ├── iot_sim/            # FastAPI :8002, generates IoT events
│   │   └── network_emulator/   # FastAPI :8003, generates network events
│   ├── attacker/               # Kali Linux (nmap, netcat, curl)
│   ├── range_logger/           # tcpdump → JSONL → Filebeat
│   ├── iot_target/             # FastAPI IoT sensor hub (HTTP :8080 + TCP :1883)
│   ├── iot_range_logger/       # tcpdump → JSONL → Filebeat
│   └── researcher-lab/         # Per-user Ubuntu container with security tools
├── infrastructure/
│   ├── ansible/playbooks/      # 12 response action playbooks
│   ├── filebeat/               # Filebeat configuration
│   └── dashboards/             # OpenSearch Dashboards exports
├── scripts/                    # bootstrap.sh, create_indices.py, compute_metrics.py, etc.
├── docs/                       # 12 documentation files
├── docker-compose.yml          # 16 services, 3 networks, 2 volumes
└── .env.example                # Environment configuration template
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main` and `develop`:

| Job | Tool | What it checks |
|---|---|---|
| `lint-backend` | `ruff check app/` | Python code quality |
| `test-backend` | `pytest tests/ -v` | Backend tests (with OpenSearch 2.11 service container) |
| `validate-docker` | `docker compose config` | Docker Compose file validity |
| `lint-frontend` | `npm run lint` | ESLint (TypeScript) |
| `build-frontend` | `npm run build` | TypeScript type-check + Vite production build |

## Environment Configuration

Copy `.env.example` to `.env` before running (`bootstrap.sh` does this automatically). Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `OPENSEARCH_URL` | `http://opensearch:9200` | OpenSearch connection |
| `OPENSEARCH_USER` / `OPENSEARCH_PASS` | `admin` / `Admin@123!Change` | OpenSearch credentials |
| `BACKEND_JWT_SECRET` | (change this!) | JWT signing key (HS256) |
| `DEFAULT_ADMIN_USER` / `DEFAULT_ADMIN_PASS` | `admin` / `CityShield@Admin2026` | Seeded admin account |
| `DEFAULT_RESEARCHER_USER` / `DEFAULT_RESEARCHER_PASS` | `researcher` / `CityShield@Researcher2026` | Seeded researcher account |
| `THREAT_INTEL_PROVIDER` | `mock` | `mock` or `abuseipdb` |
| `DETECTION_POLL_INTERVAL_SECONDS` | `30` | Detection engine poll frequency |
| `DETECTION_QUERY_WINDOW_SECONDS` | `300` | Lookback window for rule evaluation |
| `RESPONSE_POLL_INTERVAL_SECONDS` | `30` | Response manager poll frequency |
| `RESPONSE_ENABLED` | `true` | Enable/disable automated responses |
| `SCENARIO_POLL_INTERVAL_SECONDS` | `5` | Scenario runner poll frequency |
| `TRAFFIC_SIM_EVENT_RATE` / `IOT_SIM_EVENT_RATE` / `NETWORK_EMULATOR_EVENT_RATE` | `2` / `3` / `1` | Simulator events per cycle |
| `USE_MOCK_CITY_COMPONENTS` | `true` | Deterministic demo data |

## Cyber Range

Isolated attack/defense lab within CityShield using the `tleemcjr/metasploitable2` image.

| Container | Image | Network | IP | Role |
|---|---|---|---|---|
| `metasploitable` | `tleemcjr/metasploitable2` | `cyber_range_net` | 172.20.0.2 | Vulnerable target |
| `attacker` | Custom Kali | `cyber_range_net` | 172.20.0.3 | Attack tools |
| `range_logger` | Python + tcpdump | Both networks | 172.20.0.4 | Packet capture → JSONL → Filebeat |

**From the UI**: Scenarios → **Cyber Range: Port Scan** → Run Scenario

**From the terminal**:
```bash
docker exec -it attacker bash
nmap -sV metasploitable
```

## Research Lab

Per-user Ubuntu container provisioned via UI (**Scenarios → Research Lab → Provision Lab**) with pre-installed tools: nmap, hydra, nikto, netcat, tcpdump, curl, wget, python3, ping, dig. Connected to all three Docker networks.

```bash
# From the Research Lab terminal:
ping -c 2 metasploitable       # Cyber range target
nmap -sT --top-ports 20 metasploitable
curl http://iot_target:8080/sensors  # IoT range target
```

Rebuild after modifying: `docker compose build researcher-lab-image`, then Remove → Provision Lab in UI.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/bootstrap.sh` | Full platform init (Docker check, .env copy, OpenSearch, indices, assets) |
| `scripts/create_indices.py` | Manually create OpenSearch indices |
| `scripts/create_assets_simple.sh` | Populate city-assets index with 25 smart city assets |
| `scripts/compute_metrics.py` | Post-run MTTD/MTTR/detection accuracy evaluation |
| `scripts/run_scenario.py` | Run a scenario from the command line |
| `scripts/generate_dataset.py` | Generate labeled datasets for analysis |
| `scripts/fix_logs_mapping.sh` | Repair logs index mapping issues |
| `scripts/import_dashboards.sh` | Import OpenSearch Dashboard configurations |
| `scripts/verify_cyber_range.sh` | Health check for cyber range components |
| `scripts/verify_production.sh` | Production deployment verification |
| `scripts/verify_research_lab_tools_and_targets.sh` | Verify research lab connectivity and tools |

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System architecture and component descriptions |
| [Threat Model](docs/threat-model.md) | Threat modeling and security considerations |
| [Log Schema](docs/log-schema.md) | Log event schema specification |
| [Detection Rules](docs/detection-rules.md) | Detection rule format, match logic types, and examples |
| [Response Playbooks](docs/response-playbooks.md) | Automated response playbook details |
| [Scenarios](docs/scenarios.md) | Scenario definitions and creation guide |
| [API Reference](docs/api.md) | REST API endpoints reference |
| [Dashboards](docs/dashboards.md) | OpenSearch Dashboards configuration |
| [Attack Execution](docs/attack-execution.md) | Real attack execution engine guide |
| [Device Inventory](docs/device-inventory.md) | Complete 25-asset inventory with schema |
| [OpenSearch Integration](docs/opensearch-integration.md) | OpenSearch Dashboards deep-dive |
| [3D Smart City](docs/smart-city-3d.md) | Scene structure, data mapping, performance |

## Troubleshooting

### OpenSearch won't start

**Linux**: `sudo sysctl -w vm.max_map_count=262144` (persist in `/etc/sysctl.conf`)

**Low memory**: OpenSearch needs ≥4GB. Increase Docker Desktop memory in Settings → Resources.

### Port conflicts

```bash
lsof -i :9200   # OpenSearch
lsof -i :8000   # Backend
lsof -i :3000   # Frontend
```

### Backend errors or login fails

```bash
docker compose restart backend  # Re-seeds users and rules
```

### Detection rules not showing in UI

Rules are seeded from `backend/app/data/detection_rules.json` on backend startup. If missing:
```bash
docker compose restart backend  # Re-seeds 75 rules
```

### Docker Compose errors

```bash
docker compose config > /dev/null   # Validate
docker compose down -v              # Clean restart (removes data!)
docker compose up -d --build        # Rebuild everything
docker compose logs -f backend      # Debug specific service
```

## Security Considerations

- **Change Default Credentials**: Update all default passwords and JWT secret in `.env`
- **Network Isolation**: Three separate Docker networks isolate training targets from production
- **Secrets Management**: Never commit `.env` to version control
- **HTTPS**: Use a reverse proxy with TLS in production
- **OpenSearch Security**: Enable authentication and TLS for production
- **RBAC**: Enforce least-privilege access; use Viewer role for read-only users

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- MITRE ATT&CK framework for threat modeling
- OpenSearch project for search and analytics
- FastAPI and React communities

## Support

- GitHub Issues: https://github.com/SamiAhmedQMUL/CityShield/issues
- Documentation: [docs/](docs/)

---

**CityShield Platform** - Securing Tomorrow's Smart Cities Today
