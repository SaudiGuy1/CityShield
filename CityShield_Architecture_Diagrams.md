# CityShield — Architecture & Role Workflow Diagrams

---

## 1. Full Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              UI LAYER — React 18 + TypeScript + Vite                    │
│                                                                                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐  │
│  │ Dashboard  │ │  Alerts   │ │ Scenarios │ │  Devices  │ │ 3D City   │ │ Security   │  │
│  │ Overview   │ │ Triage &  │ │ Built-in  │ │ Manage &  │ │ Map       │ │ Awareness  │  │
│  │ Stats &    │ │ Analysis  │ │ Custom    │ │ Monitor   │ │ React     │ │ Role-Based │  │
│  │ Charts     │ │ Actions   │ │ Research  │ │ Power     │ │ Three     │ │ Training   │  │
│  │            │ │ Events    │ │ Lab       │ │ Control   │ │ Fiber     │ │ & Quizzes  │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └────────────┘  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                                             │
│  │  Rules    │ │  Attack   │ │   User    │                                              │
│  │  Auto-    │ │ Proposals │ │ Management│                                              │
│  │  Response │ │ Submit &  │ │ (Admin)   │                                              │
│  │  Config   │ │ Review    │ │ CRUD      │                                              │
│  └───────────┘ └───────────┘ └───────────┘                                              │
└────────────────────────────────┬──────────────────────────────┬──────────────────────────┘
                                 │ REST  /api/*                 │ WebSocket
                                 │ (JWT Bearer Token)           │ /ws/city-telemetry
                                 ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND API — FastAPI + JWT (HS256) + RBAC                        │
│                                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │  Auth    │ │  Alerts  │ │  Rules   │ │Scenarios │ │  Users   │ │   Devices       │  │
│  │  Login   │ │  CRUD    │ │  CRUD    │ │  Run     │ │  CRUD    │ │   List/Action   │  │
│  │  /me     │ │  Status  │ │  Auto-   │ │  Custom  │ │  Roles   │ │   Power Ctrl    │  │
│  │  JWT     │ │  Stats   │ │  Resp.   │ │  Attack  │ │  Active  │ │   Status        │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ Actions  │ │Proposals │ │ Metrics  │ │ Overview │ │  MITRE   │ │   Lab Service   │  │
│  │ Execute  │ │ Submit   │ │ MTTD     │ │ City     │ │ Technique│ │   Provision     │  │
│  │ Audit    │ │ Review   │ │ MTTR     │ │ Comps.   │ │ Catalog  │ │   Destroy       │  │
│  │ History  │ │ Approve  │ │ Accuracy │ │ Init DB  │ │          │ │   (Docker API)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────────────────────┘
                                 │ Read / Write (REST)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER — OpenSearch 2.11 (:9200)                            │
│                                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐ ┌────────────┐  │
│  │ logs-traffic │ │  logs-iot   │ │ logs-network│ │   alerts          │ │   rules    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────┘ └────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐ ┌────────────┐  │
│  │  scenarios  │ │   users     │ │ city-assets │ │ action-audit-log  │ │ attack-    │  │
│  │             │ │             │ │             │ │                   │ │ proposals  │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────┘ └────────────┘  │
│  ┌─────────────┐                                                                        │
│  │scenario_runs│          ┌──────────────────────────────────────────┐                   │
│  └─────────────┘          │  OpenSearch Dashboards (:5601)           │                   │
│                           │  Log Visualization & Custom Queries      │                   │
│                           └──────────────────────────────────────────┘                   │
└────────┬───────────────────────────┬──────────────────────────┬─────────────────────────┘
         │ Query logs-*              │ Poll alerts              │ Poll scenario_runs
         ▼                           ▼                          ▼
┌─────────────────────┐ ┌────────────────────────┐ ┌─────────────────────────┐
│  DETECTION ENGINE   │ │   RESPONSE MANAGER     │ │    SCENARIO RUNNER      │
│                     │ │                         │ │                         │
│  25 YAML Rules      │ │  Poll alerts (30s)      │ │  Poll runs (5s)        │
│  MITRE ATT&CK Map  │ │  Validate conditions:   │ │  Send HTTP commands    │
│  Poll logs (30s)    │ │   - severity threshold  │ │  to simulators:        │
│  Write → alerts     │ │   - enrichment check    │ │   - /attack/start      │
│  Enrich (AbuseIPDB) │ │   - rate limit check    │ │   - /attack/stop       │
│                     │ │  Execute Ansible:        │ │   - /mode              │
│  Match Logic Types: │ │   - block_ip            │ │                         │
│   net_scan          │ │   - isolate_service     │ │  Status Updates:        │
│   brute_force       │ │   - revoke_token        │ │   pending → running    │
│   c2_beacon         │ │  Write → audit-log      │ │   → completed/failed   │
│   ddos_attack       │ │                         │ │                         │
│   ransomware        │ └────────────┬────────────┘ └──────────┬──────────────┘
│   web_exploit       │              │                          │
│   iot_anomaly       │              │ Ansible Playbooks        │ HTTP Commands
│   lateral_movement  │              ▼                          ▼
│   + 17 more...      │ ┌────────────────────────┐ ┌──────────────────────────────────────┐
└─────────────────────┘ │  RESPONSE TARGETS      │ │         SIMULATORS LAYER             │
                        │                         │ │                                      │
                        │  iptables (block_ip)    │ │ ┌──────────┐┌──────────┐┌──────────┐│
                        │  docker stop (isolate)  │ │ │ Traffic  ││  IoT     ││ Network  ││
                        │  token revoke           │ │ │ Sim      ││  Sim     ││ Emulator ││
                        └─────────────────────────┘ │ │ :8001    ││  :8002   ││  :8003   ││
                                                    │ │          ││          ││          ││
┌──────────────────────────────────┐                │ │ /health  ││ /health  ││ /health  ││
│       FILEBEAT LOG SHIPPER       │                │ │ /status  ││ /status  ││ /status  ││
│                                  │◄───JSONL───────│ │ /attack/ ││ /attack/ ││ /attack/ ││
│  Ships JSONL → OpenSearch logs-* │                │ │  start   ││  start   ││  start   ││
│  Sources:                        │                │ │  stop    ││  stop    ││  stop    ││
│   - Simulator log files          │                │ └──────────┘└──────────┘└──────────┘│
│   - Range Logger captures        │                │         │           │          │     │
│   - IoT Range Logger captures    │                │     Write to OpenSearch directly    │
└──────────────────────────────────┘                │    logs-traffic  logs-iot  logs-net  │
                        ▲                           └──────────────────────────────────────┘
                        │ JSONL
                        │
┌───────────────────────┴─────────────────────────────────────────────────────────────────┐
│                              TRAINING RANGES                                            │
│                                                                                         │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  CYBER RANGE NET — 172.20.0.0/16    │  │  IOT RANGE NET — 172.21.0.0/16          │  │
│  │  (isolated, internal: true)          │  │  (isolated, internal: true)              │  │
│  │                                      │  │                                          │  │
│  │  ┌──────────────┐ ┌──────────────┐  │  │  ┌──────────────────┐ ┌───────────────┐  │  │
│  │  │Metasploitable│ │   Attacker   │  │  │  │  IoT Sensor Hub  │ │ IoT Range     │  │  │
│  │  │ (Target VM)  │ │ (Kali tools) │  │  │  │  HTTP :8080      │ │ Logger        │  │  │
│  │  │ 172.20.0.2   │ │ 172.20.0.3   │  │  │  │  MQTT :1883      │ │ (tcpdump)     │  │  │
│  │  └──────────────┘ └──────────────┘  │  │  │  172.21.0.2       │ │ 172.21.0.3    │  │  │
│  │  ┌──────────────┐                   │  │  └──────────────────┘ └───────┬───────┘  │  │
│  │  │ Range Logger │                   │  │                               │           │  │
│  │  │ (tcpdump)    │                   │  │                      JSONL to Filebeat    │  │
│  │  │ 172.20.0.4   ├───JSONL──────────►│  └──────────────────────────────────────────┘  │
│  │  └──────────────┘                   │                                                │
│  └──────────────────────────────────────┘                                                │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐    │
│  │                     RESEARCHER LAB (Dynamic, Per-User)                           │    │
│  │                                                                                  │    │
│  │  Ubuntu Container — Provisioned via Docker API by Backend                        │    │
│  │  Tools: nmap, hydra, nikto, curl, netcat, tcpdump                               │    │
│  │  Networks: cityshield_network + cyber_range_net + iot_range_net                  │    │
│  │  Access: Web terminal in UI                                                      │    │
│  │  Targets: Metasploitable (172.20.0.2) + IoT Hub (172.21.0.2)                   │    │
│  └──────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Researcher Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           RESEARCHER WORKFLOW — CityShield                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────┐
  │      LOGIN        │
  │  /login           │
  │  Credentials →    │
  │  JWT Token issued │
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────┐
  │    DASHBOARD      │
  │  /                │
  │  Review:          │
  │   • Total Events  │
  │   • Active Alerts │
  │   • Active Rules  │
  │   • Detection %   │
  │   • System Status │
  │   • 3D City Map   │
  └────────┬──────────┘
           │
           ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │                          CHOOSE RESEARCH PATH                                      │
  └──┬──────────────┬──────────────┬──────────────┬──────────────┬─────────────────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ PATH A   │  │ PATH B   │  │ PATH C   │  │ PATH D   │  │ PATH E   │
  │ Built-in │  │ Custom   │  │ Research │  │ Attack   │  │ Rule     │
  │ Scenario │  │ Scenario │  │ Lab      │  │ Proposal │  │ Manage   │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼


  PATH A — Built-in Scenario Execution
  ─────────────────────────────────────

  ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
  │  /scenarios            │     │  Quick Launch OR      │     │  Select Target        │
  │  Tab: Attack Scenarios │────►│  Browse Scenario Cards│────►│  Random or specific   │
  │                        │     │                       │     │  device from list      │
  │  View scenario cards:  │     │  Quick Launch:        │     │                       │
  │   name, severity,      │     │   DDoS | Port Scan   │     │  Target Selection     │
  │   MITRE techniques,    │     │   Brute Force |      │     │  Modal opens          │
  │   target, duration     │     │   Malware            │     │                       │
  └───────────────────────┘     └───────────────────────┘     └───────────┬───────────┘
                                                                          │
                                                                          ▼
  ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
  │  View Analysis        │     │  Monitor Execution    │     │  Scenario Running     │
  │                       │◄────│                       │◄────│                       │
  │  Click "View          │     │  Recent Scenario Runs │     │  Status transitions:  │
  │  Analysis" on         │     │  table shows:         │     │  pending → running    │
  │  completed run        │     │   run ID, status,     │     │  → completed/failed   │
  │                       │     │   target, duration    │     │                       │
  │  Detection coverage,  │     │                       │     │  Events appear on     │
  │  timing, rule matches │     │  Real-time status     │     │  Dashboard in         │
  │                       │     │  updates              │     │  real-time             │
  └───────────────────────┘     └───────────────────────┘     └───────────────────────┘


  PATH B — Custom Scenario Builder
  ─────────────────────────────────

  ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
  │  /scenarios/custom     │     │  Select MITRE         │     │  Browse 31 Attack     │
  │                        │     │  ATT&CK Techniques    │     │  Techniques           │
  │  Fill metadata:        │────►│                       │────►│                       │
  │   • Scenario name      │     │  Search catalog       │     │  4 specialized:       │
  │   • Description        │     │  Select techniques    │     │   T1046 Net Scan      │
  │   • Target component   │     │  Blue badges appear   │     │   T1565 IoT Anomaly   │
  │     (Traffic/IoT/Net)  │     │  for selected         │     │   T1110 Brute Force   │
  │   • Target device      │     │                       │     │   T1498 DDoS          │
  └───────────────────────┘     └───────────────────────┘     │  27 generic w/ params │
                                                               └───────────┬───────────┘
                                                                           │
                                                                           ▼
  ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
  │  Execute              │     │  Build Attack Chain   │     │  Configure Parameters │
  │                       │     │                       │     │                       │
  │  Click "Execute       │◄────│  Add techniques to    │◄────│  Per-technique:       │
  │  Attack Scenario"     │     │  chain (right column) │     │   • threshold         │
  │                       │     │  Reorder with arrows  │     │   • intensity         │
  │  Generates REAL       │     │  Remove unwanted      │     │   • event_types       │
  │  attack traffic       │     │                       │     │   • boolean flags     │
  └───────────┬───────────┘     │  Example chain:       │     │   • select options    │
              │                 │   1. T1046 Recon      │     │                       │
              ▼                 │   2. T1110 Brute      │     │  Click "Add to        │
  ┌───────────────────────┐     │   3. T1570 Lateral    │     │  Attack Chain"        │
  │  Results              │     │   4. T1041 Exfil      │     │                       │
  │                       │     └───────────────────────┘     └───────────────────────┘
  │  Success banner:      │
  │   • Run ID shown      │
  │   • "View Attack      │
  │     Effectiveness     │
  │     Analysis"         │
  │   • "Create Another"  │
  │   • "Back to          │
  │     Scenarios"        │
  └───────────────────────┘


  PATH C — Research Lab (Terminal-Based Penetration Testing)
  ──────────────────────────────────────────────────────────

  ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
  │  /scenarios            │     │  Click "Launch Lab"   │     │  Web Terminal Opens   │
  │  Tab: Research Lab     │────►│                       │────►│                       │
  │                        │     │  Backend provisions   │     │  Ubuntu shell with:   │
  │                        │     │  Ubuntu container     │     │   nmap, hydra, nikto  │
  │                        │     │  via Docker API       │     │   curl, netcat,       │
  │                        │     │                       │     │   tcpdump             │
  └───────────────────────┘     │  Connected to:        │     └───────────┬───────────┘
                                │   cityshield_network  │                 │
                                │   cyber_range_net     │         ┌───────┴───────┐
                                │   iot_range_net       │         │               │
                                └───────────────────────┘         ▼               ▼
                                                      ┌──────────────┐ ┌──────────────┐
                                                      │ Metasploitable│ │ IoT Sensor   │
                                                      │ 172.20.0.2   │ │ Hub          │
                                                      │              │ │ 172.21.0.2   │
                                                      │ Commands:    │ │              │
                                                      │  nmap -sV    │ │ Commands:    │
                                                      │  hydra ssh   │ │  curl /health│
                                                      │  nikto -h    │ │  curl /sensor│
                                                      │  nmap --vuln │ │  nc :1883    │
                                                      └──────┬───────┘ └──────┬───────┘
                                                             │                │
                                                             └───────┬────────┘
                                                                     │
                                                                     ▼
                                                      ┌───────────────────────┐
                                                      │  Observe Detection    │
                                                      │                       │
                                                      │  Traffic captured by  │
                                                      │  Range Loggers        │
                                                      │  → Filebeat → OS     │
                                                      │  → Detection Engine   │
                                                      │                       │
                                                      │  Switch to /alerts    │
                                                      │  to see generated     │
                                                      │  alerts               │
                                                      ├───────────────────────┤
                                                      │  Destroy Lab          │
                                                      │  when done            │
                                                      └───────────────────────┘


  PATH D — Attack Proposal Submission
  ────────────────────────────────────

  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │  /proposals        │     │  Fill Proposal    │     │  Status: Pending  │
  │                    │────►│  Form             │────►│                   │
  │  Click "+ Submit   │     │                   │     │  Waiting for      │
  │  Proposal"         │     │  • Title          │     │  Admin review     │
  │                    │     │  • Description    │     │                   │
  └───────────────────┘     │  • Technique IDs  │     └─────────┬─────────┘
                            │  • Target         │               │
                            │  • Attack Pattern │       ┌───────┴───────┐
                            │  • Duration       │       │               │
                            │  • Parameters     │       ▼               ▼
                            └───────────────────┘  ┌─────────┐    ┌─────────┐
                                                   │Approved │    │Rejected │
                                                   │         │    │         │
                                                   │Scenario │    │Read     │
                                                   │created  │    │feedback │
                                                   │→ Run it │    │→ Revise │
                                                   └─────────┘    └─────────┘


  PATH E — Detection Rule Management
  ───────────────────────────────────

  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │  /rules            │     │  Click "Details"  │     │  Configure Auto-  │
  │                    │────►│  on any rule      │────►│  Response         │
  │  Filter by:        │     │                   │     │                   │
  │   severity         │     │  View:            │     │  • Enable/Disable │
  │   enabled/disabled │     │   MITRE mapping   │     │  • Min severity   │
  │                    │     │   Response actions │     │  • Require        │
  │  Toggle enable/    │     │   Log sources     │     │    enrichment     │
  │  disable rules     │     │   False positive  │     │  • Max exec/hour  │
  └───────────────────┘     │   notes           │     │                   │
                            └───────────────────┘     │  Save settings    │
                                                      └─────────┬─────────┘
                                                                │
                                                                ▼
                                                      ┌───────────────────┐
                                                      │  Verify           │
                                                      │                   │
                                                      │  Run scenario →   │
                                                      │  Check alerts →   │
                                                      │  Confirm auto-    │
                                                      │  response fired   │
                                                      │                   │
                                                      │  Review execution │
                                                      │  history table    │
                                                      └───────────────────┘
```

---

## 3. Analyst Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             ANALYST WORKFLOW — CityShield                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────┐
  │      LOGIN        │
  │  /login           │
  │  Credentials →    │
  │  JWT Token issued │
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────┐     ┌───────────────────┐
  │    DASHBOARD      │     │   3D SMART CITY   │
  │  /                │────►│   /city            │
  │                   │     │                   │
  │  Check:           │     │  Visual scan:     │
  │   Total Events    │     │   Green = OK      │
  │   Active Alerts   │     │   Yellow = Warning│
  │   Detection Rate  │     │   Red = Critical  │
  │   System Status   │     │   Height = Events │
  │                   │     │                   │
  │  Spot anomalies   │     │  Click building → │
  │  in stats         │     │  Asset Inspector  │
  └───────────────────┘     └────────┬──────────┘
                                     │
                                     ▼
  ┌───────────────────────────────────────────────────────────────────────────────────┐
  │  ALERTS PAGE — /alerts                                                            │
  │                                                                                   │
  │  Header: Open count badge | Critical count badge                                  │
  │  Filters: Status (Open) | Severity (Critical/High) | Search | Sort               │
  └────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │
                                       ▼
                            ┌───────────────────────┐
                            │  TRIAGE ALERT LIST    │
                            │                       │
                            │  Priority order:      │
                            │   P1: Critical+Open   │
                            │   P2: High+Open       │
                            │   P3: Medium+Open     │
                            │   P4: Low+Open        │
                            │                       │
                            │  Click alert to       │
                            │  expand →             │
                            └───────────┬───────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
  │  TAB 1: ANALYSIS    │    │  TAB 2: ACTIONS     │    │  TAB 3: RELATED     │
  │                     │    │                     │    │  EVENTS             │
  │  Rule name & ID     │    │  Available Actions: │    │                     │
  │  Severity badge     │    │  ┌───────────────┐  │    │  Event timeline     │
  │  MITRE ATT&CK:     │    │  │  block_ip     │  │    │  Raw log events     │
  │   technique ID      │    │  │  iptables     │  │    │  that triggered     │
  │   technique name    │    │  └───────────────┘  │    │  the alert          │
  │   tactic            │    │  ┌───────────────┐  │    │                     │
  │   kill chain phase  │    │  │isolate_service│  │    │  Each event shows:  │
  │                     │    │  │  docker stop  │  │    │   timestamp         │
  │  Threat Narrative:  │    │  └───────────────┘  │    │   src_ip → dst_ip   │
  │   What Happened     │    │  ┌───────────────┐  │    │   event type        │
  │   Why Dangerous     │    │  │ revoke_token  │  │    │   payload           │
  │   How to Fix        │    │  │  session kill │  │    │                     │
  │                     │    │  └───────────────┘  │    │  Cross-reference:   │
  │  Indicators:        │    │                     │    │   filter by src_ip  │
  │   IPs, ports        │    │  Execution History: │    │   filter by dst_ip  │
  │                     │    │   audit_id, action, │    │   MITRE chains      │
  │  Enrichment:        │    │   status, who,      │    │                     │
  │   AbuseIPDB score   │    │   timestamps        │    │  "View in           │
  │   abuse categories  │    │                     │    │   OpenSearch"        │
  │   country           │    │                     │    │   button             │
  └──────────┬──────────┘    └──────────┬──────────┘    └─────────────────────┘
             │                          │
             │  Classify:               │
             │  True Positive ──────────┘
             │  False Positive → Resolve
             │  Escalate → Flag
             │
             ▼
  ┌───────────────────────┐
  │  EXECUTE RESPONSE     │
  │                       │
  │  1. Click "Execute"   │
  │     on action card    │
  │                       │
  │  2. Confirmation      │
  │     Dialog opens:     │
  │     • Action name     │
  │     • Target params   │
  │     • Risk warning    │
  │     • ☑ Acknowledge   │
  │       risk checkbox   │
  │                       │
  │  3. Click "Confirm"   │
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐     ┌───────────────────────┐
  │  MONITOR EXECUTION    │     │  EXECUTION DETAILS    │
  │                       │────►│  MODAL                │
  │  Status:              │     │                       │
  │   pending → success   │     │  Playbook path        │
  │   pending → failed    │     │  Start/End timestamps │
  │                       │     │  stdout output        │
  │  Click execution      │     │  stderr output        │
  │  entry for details    │     │  Parameters used      │
  └───────────────────────┘     │  Error details        │
                                └───────────┬───────────┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                        ▼                                       ▼
              ┌───────────────────┐                   ┌───────────────────┐
              │  SUCCESS          │                   │  FAILED           │
              │                   │                   │                   │
              │  Update status:   │                   │  Review error     │
              │  Open → Triaged   │                   │  Retry action     │
              │  → Resolved       │                   │  or escalate      │
              └─────────┬─────────┘                   │  to Admin         │
                        │                             └───────────────────┘
                        ▼
              ┌───────────────────┐     ┌───────────────────┐
              │  VERIFY & CLOSE   │     │  NEXT ALERT       │
              │                   │────►│                   │
              │  "View on Map"    │     │  Return to alert  │
              │  → 3D city view   │     │  list             │
              │                   │     │                   │
              │  "View Device"    │     │  Process next     │
              │  → device detail  │     │  by priority      │
              │                   │     │                   │
              │  Review audit log │     │  Continuous       │
              │  for completeness │     │  monitoring cycle │
              └───────────────────┘     └───────────────────┘
```

---

## 4. Administrator Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          ADMINISTRATOR WORKFLOW — CityShield                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────┐
  │      LOGIN        │
  │  /login           │
  │  Admin credentials│
  │  JWT Token issued │
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────────────────────────────────────────────────────────────────────┐
  │  DASHBOARD — /                                                                    │
  │                                                                                   │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                             │
  │  │  Total   │ │  Active  │ │  Active  │ │Detection │   System Status:             │
  │  │  Events  │ │  Alerts  │ │  Rules   │ │  Rate %  │   Traffic Sim ● IoT Sim ●   │
  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   Network Emu ● Det.Eng. ●  │
  │                                                                                   │
  │  3D Smart City Map  |  Event Activity Chart  |  Component Distribution Pie       │
  └────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │
                                       ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │                            ADMIN TASK SELECTION                                    │
  └──┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────────────────┘
     │          │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼          ▼


  TASK 1 — User Management (/admin/users)
  ────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │  User Management Page                                        │
  │                                                              │
  │  ┌──────────────────────────────────────────────────┐       │
  │  │  "+ Create User" button                          │       │
  │  │                                                  │       │
  │  │  Form:                                           │       │
  │  │   Username: [________]  Email: [____________]    │       │
  │  │   Password: [________]  Role:  [▼ Analyst    ]   │       │
  │  │   Active: [✓]                                    │       │
  │  │   [Create]  [Cancel]                             │       │
  │  └──────────────────────────────────────────────────┘       │
  │                                                              │
  │  ┌──────────────────────────────────────────────────────┐   │
  │  │ Username │ Email         │ Role         │ Status │ ⚙ │   │
  │  ├──────────┼───────────────┼──────────────┼────────┼───┤   │
  │  │ admin    │ admin@cs.com  │ Administrator│ Active │ ⚙ │   │
  │  │ researcher│ res@cs.com  │ Researcher   │ Active │ ⚙ │   │
  │  │ analyst1 │ ana@cs.com   │ Analyst      │ Active │ ⚙ │   │
  │  └──────────┴───────────────┴──────────────┴────────┴───┘   │
  │                                                              │
  │  Actions per user: [Enable/Disable] [Delete → Confirm]      │
  └──────────────────────────────────────────────────────────────┘


  TASK 2 — Device Management (/devices)
  ──────────────────────────────────────

  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │  Filters          │     │  Devices Table    │     │  Device Detail    │
  │                   │────►│                   │────►│  Panel            │
  │  Zone    [▼ All ] │     │  Name | Status |  │     │                   │
  │  Type    [▼ All ] │     │  Zone | Type |    │     │  Full identity    │
  │  Status  [▼ All ] │     │  Criticality |    │     │  Location + zone  │
  │  Search  [______] │     │  Events | Alerts  │     │  Metrics:         │
  │  Has Alerts [  ]  │     │                   │     │   events, alerts  │
  │                   │     │  Click row for    │     │   risk score      │
  │  Badges:          │     │  details →        │     │  Performance      │
  │   Total: 24       │     │                   │     │   chart           │
  │   Active: 20      │     │                   │     │  Related alerts   │
  │   Alerted: 5      │     │                   │     │  [Enable/Disable] │
  └───────────────────┘     └───────────────────┘     └───────────────────┘


  TASK 3 — Proposal Review (/proposals)
  ──────────────────────────────────────

  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │  Filter Tabs      │     │  Proposal Cards   │     │  Review Modal     │
  │                   │────►│                   │────►│                   │
  │  [All] [Pending]  │     │  Title            │     │  Full proposal    │
  │  [Approved]       │     │  Description      │     │  details          │
  │  [Rejected]       │     │  Submitter + date │     │                   │
  │                   │     │  Status badge     │     │  Review Comment:  │
  │                   │     │  MITRE badges     │     │  [____________]   │
  │                   │     │                   │     │                   │
  │                   │     │  Click "Review"   │     │  [✓ Approve]      │
  │                   │     │  on pending →     │     │  [✗ Reject ]      │
  └───────────────────┘     └───────────────────┘     └───────────────────┘

  Approve → Scenario created, Researcher can execute
  Reject  → Feedback sent, Researcher can revise & resubmit


  TASK 4 — Rule Oversight & Auto-Response (/rules)
  ─────────────────────────────────────────────────

  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │  Rules Table      │     │  Rule Detail      │     │  Auto-Response    │
  │                   │────►│  Modal            │────►│  Configuration    │
  │  Filter:          │     │                   │     │                   │
  │   Severity [▼]    │     │  MITRE technique  │     │  [✓] Enabled      │
  │   Status   [▼]    │     │  Response actions │     │  Min severity: [▼]│
  │                   │     │  Log sources      │     │  Require          │
  │  25 rules listed  │     │  False positive   │     │   enrichment: [✓] │
  │  Toggle on/off    │     │   notes           │     │  Max exec/hr: [10]│
  │  Click "Details"  │     │                   │     │                   │
  │                   │     │                   │     │  [Save Settings]  │
  └───────────────────┘     └───────────────────┘     ├───────────────────┤
                                                      │  Execution        │
                                                      │  History Table    │
                                                      │  Recent automated │
                                                      │  executions       │
                                                      └───────────────────┘


  TASK 5 — System Monitoring & Metrics
  ─────────────────────────────────────

  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │  Overview          │     │  OpenSearch       │     │  API Docs         │
  │  Dashboard /       │     │  Dashboards       │     │  :8000/docs       │
  │                   │     │  :5601            │     │                   │
  │  System Status:   │     │                   │     │  Swagger UI       │
  │   ● Traffic Sim   │     │  Custom queries   │     │  All endpoints    │
  │   ● IoT Sim       │     │  across indices   │     │  Test API calls   │
  │   ● Network Emu   │     │  Log visualization│     │                   │
  │   ● Det. Engine   │     │                   │     │                   │
  └───────────────────┘     └───────────────────┘     └───────────────────┘

  ┌───────────────────┐     ┌───────────────────┐
  │  Metrics          │     │  Audit Log        │
  │                   │     │  /api/actions/     │
  │  MTTD (detect)    │     │  audit             │
  │  MTTR (respond)   │     │                   │
  │  Det. Accuracy    │     │  All manual +     │
  │  Response Success │     │  automated        │
  │  Rule Coverage    │     │  actions logged   │
  │                   │     │  Filter by:       │
  │  Via API or       │     │   date, type,     │
  │  compute_metrics  │     │   status, rule    │
  │  script           │     │                   │
  └───────────────────┘     └───────────────────┘


  TASK 6 — Security Awareness (/awareness)
  ─────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │  Three Training Categories                                   │
  │                                                              │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
  │  │  Employee    │  │  Executive   │  │  IT/Security │      │
  │  │  Training    │  │  Training    │  │  Training    │      │
  │  │             │  │             │  │             │      │
  │  │  Phishing   │  │  BEC        │  │  Incident   │      │
  │  │  Passwords  │  │  Compliance │  │  Response   │      │
  │  │  USB Safety │  │  Incident   │  │  Monitoring │      │
  │  │  Data Prot. │  │  Comms      │  │  Forensics  │      │
  │  │             │  │             │  │             │      │
  │  │  Quiz: 70%  │  │  Quiz: 75%  │  │  Quiz: 80%  │      │
  │  │  to pass    │  │  to pass    │  │  to pass    │      │
  │  └──────────────┘  └──────────────┘  └──────────────┘      │
  └──────────────────────────────────────────────────────────────┘
```

---

## 5. User Navigation Map — How You Move Inside the System

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE USER NAVIGATION MAP — CityShield                             │
│                    Every page, every click, every destination                            │
└───────────���─────────────────────────────────��─────────────────────────���─────────────────┘


  ENTRY POINT
  ───────────

  ┌─────────────────��──────────────────────��─────────────────────────┐
  │                        /login                                    │
  │                                                                  │
  │   [Username] [Password] → Click "Access System"                  │
  │                                                                  │
  │   On success: JWT saved → redirect to /                          │
  │   On failure: Error message shown, stay on /login                │
  └───────────��────────────────────┬───────��─────────────────────────┘
                                   │
                                   ▼
  ┌─────────────────────────────────────────────��────────────────────┐
  │                     SIDEBAR NAVIGATION                           │
  │                  (present on every page after login)              │
  │                                                                  │
  │   ┌──────────────┐                                               │
  │   │  CityShield  │  ← Brand logo                                │
  │   ├──��───────────┤                                               │
  │   �� ■ Dashboard  │ → /              All roles                    │
  │   │ ■ Smart City │ → /city          All roles                    │
  │   │ ■ Alerts     │ → /alerts        All roles                    │
  │   │ ■ Devices    │ → /devices       All roles                    │
  │   │ ■ Scenarios  │ → /scenarios     All roles                    │
  │   │ ■ Rules      │ → /rules         All roles                    │
  │   │ ■ Awareness  │ → /awareness     All roles                    │
  │   │ ■ Proposals  │ → /proposals     Admin + Researcher only      │
  │   │ ■ Users      │ → /admin/users   Admin only                   │
  │   ├────────���─────┤                                               │
  ���   │  [ATTACK     │  ← Appears when a scenario is running         │
  │   │   LIVE]      │                                               │
  │   ├─────────���────┤                                               │
  │   │  User: sami  │                                               │
  │   │  Role: Admin │                                               │
  │   │  [Logout]    │ → Clears JWT → redirect to /login             │
  │   └──────────────┘                                               │
  └──────────────────────────────────────────────────────────────────┘


  PAGE-BY-PAGE: WHAT YOU SEE, WHAT YOU CLICK, WHERE IT GOES
  ──────────────────��───────────────────────────────────────


  ┌───────��──────────────��──────────────────────────────���────────────┐
  │  PAGE: DASHBOARD  /                                              │
  ├────��──────────────────────────────────────────────��──────────────┤
  │                                                                  │
  │  ┌──────────┐ ┌──────────┐ ┌───────��──┐ ┌────────��─┐           │
  │  │  Total   │ │  Active  │ │  Active  │ │Detection │           ��
  │  │  Events  │ │  Alerts  │ │  Rules   │ │  Rate %  │           │
  │  └──────────┘ ���──────────┘ └���─────────┘ └─────────���┘           │
  ��                                                                  │
  │  ┌──────────────────────────────────────────────────┐           │
  │  │            3D Smart City Map (embedded)           │           │
  ��  │         Click any building → see asset info       │           │
  │  └─────────────────────────────────────────────���────┘           │
  │                                                                  │
  │  ┌─────────────────────┐  ┌────���────────────────────┐           │
  │  │  Event Activity     │  │  Component Distribution │           │
  │  │  (area chart)       │  │  (pie chart)            │           │
  │  └───────��─────────────┘  └��────────────────────────┘           │
  │                                                                  │
  │  ┌─────────────────────┐  ┌──────────────���──────────┐           │
  │  │  System Status      │  │  External Services      │           │
  │  │  ● Traffic Sim      │  │                         │           │
  │  │  ● IoT Sim          │  │  Click "OpenSearch      │           ���
  │  │  ● Network Emu      │  │  Dashboards"  → :5601   │           │
  │  │  ● Det. Engine      │  │                         │           │
  │  │                     │  │  Click "API Docs"       │           │
  │  │                     │  │            → :8000/docs  │           │
  │  │                     │  │                         │           │
  │  │                     │  │  Click "Initialize      │           │
  │  │                     │  │  Dashboards" → sets up  │           │
  │  │                     │  │  default visualizations │           │
  │  └─────────────────────┘  └─────────────────────────┘           │
  │                                                                  │
  │  Data refreshes every 5 seconds (polling)                        │
  └─────────────────────────────────────────────���────────────────────┘


  ┌─────────────────────��────────────────────────────────���───────────┐
  │  PAGE: 3D SMART CITY  /city                                      │
  ├────────���────────────────────────���────────────────────────────────┤
  │                                                                  │
  │  Full-screen 3D canvas with interactive controls                 │
  │                                                                  │
  │  MOUSE CONTROLS:                                                 │
  │    Drag         → Rotate camera                                  │
  │    Scroll       → Zoom in/out                                    │
  │    Click ground → Deselect asset                                 │
  │    Click building → Opens Asset Inspector panel (right side)     │
  │                                                                  │
  │  HUD BUTTONS (top-right):                                        │
  │    [Auto-Rotate]   → Toggle camera auto-rotation                 │
  ���    [Show Panels]   → Toggle bottom data panels                   │
  │    [Reset Camera]  → Return to default camera position           │
  │                                                                  │
  │  BOTTOM PANELS (5 data panels):                                  │
  │    Traffic │ Energy │ Population │ Air Quality │ Network          │
  │                                                                  │
  │  ASSET INSPECTOR (right sidebar, appears on building click):     │
  │    Shows: name, type, status, zone, events, alerts, risk score   │
  │                                                                  │
  │  VISUAL INDICATORS:                                              │
  │    Green building   = normal                                     │
  │    Yellow building  = warning                                    │
  │    Red building     = critical alerts                            │
  │    Pulsing/flashing = under active attack                        │
  │    Building height  = relative event count                       │
  │                                                                  │
  │  Real-time updates via WebSocket /ws/city-telemetry              │
  └──────────────��───────────────────────────────���───────────────────┘


  ┌───────────────────────────────────────────��──────────────────────┐
  │  PAGE: ALERTS  /alerts                                           │
  ├────���─────────��───────────────────────────────────────────────────┤
  │                                                                  │
  │  HEADER: "Security Alerts" + Open count badge + Critical badge   │
  │                                                                  │
  │  FILTERS (top bar):                                              │
  │    Status [▼ Open/Triaged/Resolved]                              │
  │    Severity [▼ Critical/High/Medium/Low]                         │
  │    [Search box]                                                  │
  │    Sort by [▼ newest/oldest/severity]                            │
  │                                                                  │
  │  ALERT LIST (cards, newest first):                               │
  │    Each card shows: severity badge, rule name, zone, status      │
  │                                                                  │
  │    Click any alert card → EXPANDS to show 3 TABS:                │
  │    ┌─────────────────────────���───────────────────────────┐       │
  │    │  [Analysis]  │  [Actions]  │  [Related Events]      │       │
  │    ├───────────────────────────────────���─────────────────┤       │
  │    │                                                     │       │
  │    │  Analysis tab:                                      │       │
  │    ��    MITRE technique + tactic + kill chain phase       │       │
  │    │    What Happened / Why Dangerous / How to Fix        │       │
  │    │    Indicators (IPs, ports)                           │       │
  │    │    Enrichment (AbuseIPDB score if available)         │       │
  │    │                                                     │       │
  │    │  Actions tab:                                       │       │
  │    │    3 action cards: block_ip, isolate_service,       │       │
  │    │                    revoke_token                      │       │
  │    │    Click [Execute] → Confirmation dialog opens      │       │
  │    │      ☑ Acknowledge risk → [Confirm]                 │       │
  │    │    Action History table below                        │       │
  │    │    Click any history row → Execution Details modal   │       │
  │    │                                                     │       │
  │    │  Related Events tab:                                │       │
  │    │    Timeline of raw events that triggered the alert   │       │
  │    │    Each event: timestamp, src_ip, dst_ip, type       │       │
  │    └───────────��─────────────────────────────────────────┘       │
  │                                                                  │
  │  ON EXPANDED ALERT — additional buttons:                         │
  │    Status dropdown [Open ▼] → change to Triaged / Resolved      │
  │    [View on Map]         → navigates to / with asset highlighted │
  │    [View in OpenSearch]  → opens :5601 with pre-filtered query   │
  │    [View Device]         → navigates to /devices?device=assetId  │
  │                                                                  │
  │  Data refreshes every 5 seconds (polling)                        │
  └─────────────────────���────────────────────────────────────────────┘


  ┌──────────────────────────────────────────────────────────────────┐
  │  PAGE: DEVICES  /devices                                         ���
  ├─────────────────────────────────────────────���────────────────────┤
  │                                                                  │
  │  HEADER: "Device Management" + Total / Active / Alerted badges   │
  │                                                                  │
  │  FILTERS:                                                        │
  │    Zone [▼]  Type [▼]  Status [▼]  Criticality [▼]              │
  │    [Search box]  Has Alerts [toggle]                              │
  │                                                                  │
  │  DEVICES TABLE:                                                  │
  │    Columns: Name | Status | Zone | Type | Criticality |          │
  │             Events | Alerts | Last Updated | Actions             │
  │                                                                  │
  │    Click any row → DEVICE DETAIL PANEL opens:                    │
  │      Device name, description, location                          │
  │      Metrics: events, alerts, risk score                         │
  │      Performance chart                                           │
  │      Related alerts table                                        │
  │      [Enable/Disable] [View Logs]                                │
  └────────────────���───────────────────────────���─────────────────────┘


  ┌────���─────────────────────────────────────────────────────────────┐
  │  PAGE: SCENARIOS  /scenarios                                     │
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  TWO TABS at top:                                                │
  │    [Attack Scenarios]  │  [Research Lab]                          │
  │                                                                  │
  │  ─── Tab 1: Attack Scenarios ───                                 │
  │                                                                  │
  │  [Custom Scenario Builder] button                                │
  │    → navigates to /scenarios/custom                              │
  │                                                                  │
  │  QUICK LAUNCH (4 buttons):                                       │
  │    [DDoS] [Port Scan] [Brute Force] [Malware]                    │
  │    Click any → Target Selection Modal opens                      │
  │      Pick "Random" or specific device → scenario starts          │
  │                                                                  │
  │  SCENARIO CARDS (grid):                                          │
  │    Each card: name, severity, MITRE techniques, target, duration │
  │    Click [Run & Watch] → Target Selection Modal → starts run     │
  │                                                                  │
  │  RECENT SCENARIO RUNS (table):                                   ���
  │    Run ID | Name | Status | Target | Started | Duration          │
  │    Click [View Analysis] on completed run → Analysis modal       │
  │                                                                  │
  ��  ─── Tab 2: Research Lab ───                                     │
  │                                                                  │
  │  Click [Launch Lab] → provisions Ubuntu container                │
  │  Web terminal appears in UI                                      │
  │  Click [Destroy Lab] when done                                   │
  └─────���────────────────────────────────────────────────────────────┘


  ┌────────────────────────────────────────────────────────────────��─┐
  │  PAGE: CUSTOM SCENARIO BUILDER  /scenarios/custom                │
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  TWO-COLUMN LAYOUT:                                              │
  │                                                                  │
  │  LEFT COLUMN                      RIGHT COLUMN                   │
  │  ┌────────────────────────┐       ┌───────────────────────┐      │
  │  │ Scenario Details       │       │ Attack Chain          │      │
  │  │  Name [__________]     │       │                       ��      │
  │  │  Description [_____]   │       │  1. T1046 Net Scan    │      │
  ���  │  Target Comp [▼]       │       │     [↑] [↓] [✗]      │      │
  │  │  Target Device [____]  │       │  2. T1110 Brute Force │      ��
  │  │                        │       │     [↑] [↓] [✗]      ���      │
  │  │ MITRE Techniques       │       │  3. T1041 Exfil       │      │
  │  │  [Search___________]   │       │     [↑] [↓] [✗]      │      │
  │  │  Click to select →     │       │                       │      │
  │  │  blue badges appear    │       │                       │      │
  │  ├────────────────────────┤       │ [Execute Attack       │      │
  │  │ Attack Techniques      │       │  Scenario]            │      │
  │  │  Click technique →     │       └─────���─────────────────┘      │
  │  │  parameters appear:    │                                      │
  │  │   threshold [__]       │       After execution:               │
  │  │   intensity [__]       │       ┌───────────────────────┐      │
  │  │   event_types [▼]      │       │ Success Banner        │      │
  │  │  [Add to Attack Chain] │       │  Run ID: abc-123      │      │
  │  │  → appears in right    │       │  [View Analysis]      │      │
  │  │    column              │       │  [Create Another]     │      │
  │  └────────────────────────┘       │  [Back to Scenarios]  │      │
  │                                   │   → /scenarios        │      │
  │                                   └───────────────────────┘      │
  └──���───────────────────────────────────────────────────────────���───┘


  ┌───────────────────────────────────────────────────────────────���──┐
  │  PAGE: RULES  /rules                                             │
  ├──────────────────────────────────────────────���───────────────────┤
  │                                                                  │
  │  FILTERS:                                                        │
  │    Severity [▼ All/Low/Medium/High/Critical]                     │
  │    Status   [▼ All/Enabled/Disabled]                             │
  │                                                                  │
  │  RULES TABLE:                                                    │
  │    Rule Name | Severity | MITRE Technique | Component | Status   │
  │                                                                  │
  │    Per row:                                                      │
  │      [Enable/Disable] toggle                                     │
  │      Click [Details] → RULE DETAIL MODAL opens:                  │
  │        ┌────────────────────────────────────────────┐            │
  │        │  Rule name + description                    │            │
  │        │  MITRE Technique (ID + name)                │            │
  │        │  Severity badge                             │            │
  ���        │  Response Actions (badges)                  │            │
  │        │  Log Sources (badges)                       │            │
  │        │  False Positive Notes                       │            │
  │        │                                             │            │
  │        │  AUTO-RESPONSE CONFIGURATION:               │            │
  │        │  [✓/✗] Enable auto-response                 │            │
  │        │  Min Severity [▼]                           │            │
  │        │  Require Enrichment [checkbox]               │            │
  │        │  Max Executions/Hour [__]                    │            ���
  │        │  [Save Auto-Response Settings]              │            │
  │        │                                             │            │
  │        │  RECENT AUTOMATED EXECUTIONS table           │            │
  │        │  Click row → Execution Details modal         │            │
  │        └─���──────────────────────────────────────────┘            │
  └───���───────────────────────────────���──────────────────────────────┘


  ┌──────────────────────────────────────────────────────────────────┐
  │  PAGE: ATTACK PROPOSALS  /proposals                              │
  ├─────────────────────────────────────────────────────���────────────┤
  │                                                                  │
  │  FILTER TABS: [All] [Pending] [Approved] [Rejected]              │
  │                                                                  │
  │  [+ Submit Proposal] button (Researcher/Admin)                   │
  │    → FORM MODAL:                                                 │
  │    Title [________]                                              │
  │    Description [___________]                                     │
  │    Technique IDs [search + select]                               │
  │    Target Component [▼]                                          │
  │    Attack Pattern [▼]                                            │
  │    Duration (seconds) [__]                                       │
  │    Parameters [+ Add key-value]                                  │
  │    [Submit] [Cancel]                                             │
  │                                                                  │
  │  PROPOSAL CARDS:                                                 │
  │    Title, description, submitter, date, status badge, techniques  │
  │                                                                  │
  │    Pending proposal (Admin sees):                                │
  │      Click [Review] → REVIEW MODAL:                              │
  │        Full proposal details                                     │
  │        Review Comment [___________]                              │
  │        [Approve]  →  Scenario created, ready to run              │
  │        [Reject]   →  Feedback sent to researcher                 │
  │                                                                  │
  │    Approved proposal: shows linked Scenario ID                    │
  ��    Rejected proposal: shows reviewer's comment                    │
  └──────────────────────────────────���───────────────────────────────┘


  ┌���──────────────────────────────────────────────────────────────���──┐
  │  PAGE: USER MANAGEMENT  /admin/users  (Admin only)               │
  ├─────────────��────────────────────────────────────────────────────┤
  │                                                                  │
  │  [+ Create User] button → CREATE USER FORM:                      │
  │    Username [________]                                           │
  │    Email    [________]                                           │
  │    Password [________]                                           │
  │    Role     [▼ Analyst / Researcher / Administrator]             │
  │    Active   [✓]                                                  │
  │    [Create] [Cancel]                                             │
  │                                                                  │
  │  USERS TABLE:                                                    │
  │    Username | Email | Role (badge) | Status | Created | Actions  │
  │                                                                  │
  │    Per row:                                                      │
  │      [Enable/Disable] → toggles user active status               │
  │      [Delete] → Confirm dialog → removes user                    │
  └��─────────────────────────────────────────────────────────────────┘


  ┌──────────────────────────────────────────────────────────────────┐
  │  PAGE: SECURITY AWARENESS  /awareness                            │
  ���──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  THREE CATEGORY TABS at top:                                     │
  │    [Employee Training]  [Executive Training]  [IT/Security]      │
  │                                                                  │
  │  Inside each category, THREE SECTION TABS:                       │
  │    [Training]  │  [Scenarios]  │  [Quiz]                         │
  │                                                                  │
  │    Training tab:                                                 │
  │      4 lesson modules with objectives + key concepts             │
  │      Click module to expand                                      │
  │                                                                  │
  │    Scenarios tab:                                                │
  │      Interactive situational exercises                            │
  │                                                                  │
  │    Quiz tab:                                                     │
  │      5 questions, 4 choices each                                 │
  │      Click answer → [Submit] → Correct/Incorrect feedback        │
  │      After all 5: Pass/Fail banner (threshold varies by role)    │
  └��─────────────────────────────────────────────────────────────────┘
```

---

## 6. Cross-Page Links — Where Clicks Take You Across Pages

```
┌─────────────────────────────────────────────────────���───────────────────────────────────┐
│                    CROSS-PAGE NAVIGATION LINKS                                          │
│                    Clicks that jump you to a different page                              │
└─��──────────────────────────────────────────────────────────────���────────────────────────┘


  FROM                         ACTION                          TO
  ────                         ──────                          ──

  /alerts (expanded alert)     Click "View on Map"          →  /  (dashboard, asset highlighted)
  /alerts (expanded alert)     Click "View Device"          →  /devices?device=assetId
  /alerts (expanded alert)     Click "View in OpenSearch"   →  :5601 (external, filtered query)

  /scenarios                   Click "Custom Scenario        →  /scenarios/custom
                               Builder" button

  /scenarios/custom            Click "Back to Scenarios"     →  /scenarios
  /scenarios/custom            Click "View Analysis"         →  Analysis modal (stays on page)

  / (dashboard)                Click "OpenSearch Dashboards" →  :5601 (external)
  / (dashboard)                Click "API Documentation"     →  :8000/docs (external)

  /proposals (approved)        Linked Scenario ID            →  Scenario is on /scenarios

  Any page                     Click sidebar nav item        →  That page
  Any page                     Click [Logout]                →  /login


  VISUAL FLOW SUMMARY:

            ┌────────┐
            │ /login │
            └───┬────┘
                │
                ▼
  ┌──────��──────────────────────────────────────────────────────────┐
  │                        SIDEBAR NAV                              │
  │  Always visible.  Click any item to jump directly.              │
  └───┬─────┬───────┬───────┬────────┬───────┬───────┬──────┬──────┘
      │     │       │       │        │       │       │      ��
      ▼     ▼       ▼       ▼        ▼       ▼       ▼      ▼
    /     /city  /alerts  /devices /scenarios /rules /awareness ...
      │               │       ▲        │
      │               │       │        │
      │  "View on     │ "View │   "Custom Scenario
      │   Map"        │ Device"│    Builder" button
      │               │       │        │
      └───────────────┘       │        ▼
            jumps to /        │   /scenarios/custom
            with highlight    │        │
                              │   "Back to Scenarios"
                              │        │
                              └────────┘


  WITHIN-PAGE NAVIGATION (tabs, modals, panels):

  /alerts        →  Click alert card    →  Expands (Analysis / Actions / Related Events tabs)
                 →  Actions tab         →  Click Execute     →  Confirmation dialog
                 →  Confirmation dialog →  Click Confirm     →  Execution starts
                 →  Action History      →  Click entry       →  Execution Details modal

  /scenarios     →  Tab: Attack Scenarios / Research Lab
                 →  Click Run & Watch   →  Target Selection modal → run starts
                 →  Click View Analysis →  Analysis modal

  /scenarios/custom → Left: fill details + pick techniques + configure params
                    → Right: attack chain builds up
                    → Click Execute → success banner → View Analysis modal

  /rules         →  Click Details       →  Rule Detail modal
                 →  Auto-Response       →  Configure + Save
                 →  Execution History   →  Click entry       →  Execution Details modal

  /proposals     →  Click + Submit      →  Proposal form modal
                 →  Click Review        →  Review modal (Admin) → Approve / Reject

  /admin/users   →  Click + Create User →  Create form modal
                 →  Click Delete        →  Confirm dialog

  /devices       →  Click row           →  Device Detail panel
  /city          →  Click building      →  Asset Inspector panel
  /awareness     →  Category tabs → Section tabs (Training / Scenarios / Quiz)
```

---

*CityShield — Smart City Cyber Range Platform*
*Architecture & Workflow Diagrams*
*April 2026*
