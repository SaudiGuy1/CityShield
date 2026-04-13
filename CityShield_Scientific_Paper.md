# CityShield: A Smart City Cyber Range Platform for Threat Detection, Response Training, and Security Research

---

**Authors:** Sami (Project Lead & Full-Stack Developer), Bati & Khaled (Security Researchers), Thamer (Security Analyst), Abdulwahab (UI/UX Designer)

**Abstract** — This paper presents CityShield, a containerized smart city cyber range platform designed for cybersecurity training, threat detection evaluation, and automated incident response research. The platform simulates critical smart city infrastructure — including traffic management, IoT sensor networks, and enterprise network components — while providing realistic attack generation, MITRE ATT&CK-aligned detection rules, and automated response playbooks. CityShield implements role-based access control with distinct operational workflows for Administrators, Analysts, and Researchers, each supported by dedicated tooling and interfaces. The platform employs OpenSearch as its sole data store, enabling unified log correlation, real-time alerting, and immutable audit trails. This paper details the system architecture, role-specific operational playbooks, detection methodology, and the case management lifecycle from threat discovery to incident closure.

**Keywords:** Cyber Range, Smart City Security, MITRE ATT&CK, Incident Response, Threat Detection, SOAR, Security Training, OpenSearch

---

## 1. Introduction

Smart city ecosystems integrate heterogeneous technologies — traffic control systems, IoT sensor networks, surveillance infrastructure, and enterprise IT — creating an expanded attack surface that traditional security training environments fail to replicate. Existing cyber ranges often focus on isolated network scenarios and lack the multi-domain complexity inherent in smart city deployments.

CityShield addresses this gap by providing:

1. **Realistic multi-domain simulation** of traffic, IoT, and network infrastructure generating authentic telemetry
2. **Real attack execution** through an integrated attack engine (not simulated patterns), producing genuine malicious traffic
3. **MITRE ATT&CK-aligned detection** with 25 detection rules covering reconnaissance through impact
4. **Automated response orchestration** via Ansible playbooks with configurable triggers and rate limiting
5. **Role-based operational workflows** supporting three distinct cybersecurity roles with dedicated tooling
6. **Isolated training networks** enabling safe offensive security research without external exposure

The platform is fully containerized using Docker Compose, requiring no cloud dependencies, and can be deployed on a single workstation with 8–16 GB of RAM.

---

## 2. System Architecture

### 2.1 High-Level Architecture

CityShield follows a microservices architecture comprising 16 containerized services organized across three isolated Docker networks.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CityShield Platform                              │
│                                                                         │
│  ┌──────────────────────── cityshield_network ────────────────────────┐ │
│  │                        (172.22.0.0/16)                             │ │
│  │                                                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │ Frontend │  │ Backend  │  │OpenSearch│  │   Dashboards     │  │ │
│  │  │ React+TS │  │ FastAPI  │  │  2.11    │  │  (Visualization) │  │ │
│  │  │ :3000    │  │ :8000    │  │  :9200   │  │     :5601        │  │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────────┘  │ │
│  │       │              │              │                               │ │
│  │       │    REST /api + WebSocket    │                               │ │
│  │       └──────────────┘              │                               │ │
│  │                                     │                               │ │
│  │  ┌─────────────────────────────────┐│  ┌────────────────────────┐  │ │
│  │  │       Simulators Layer          ││  │   Processing Layer     │  │ │
│  │  │  ┌───────────┐ ┌───────────┐   ││  │  ┌──────────────────┐  │  │ │
│  │  │  │Traffic Sim│ │  IoT Sim  │   ├┤  │  │Detection Engine  │  │  │ │
│  │  │  │   :8001   │ │   :8002   │   ││  │  │  (25 YAML rules) │  │  │ │
│  │  │  └───────────┘ └───────────┘   ││  │  ├──────────────────┤  │  │ │
│  │  │  ┌───────────┐                 ││  │  │Response Manager  │  │  │ │
│  │  │  │ Network   │  ┌───────────┐  ││  │  │(Ansible playbooks│  │  │ │
│  │  │  │ Emulator  │  │ Scenario  │  ││  │  ├──────────────────┤  │  │ │
│  │  │  │   :8003   │  │  Runner   │  ││  │  │  Filebeat        │  │  │ │
│  │  │  └───────────┘  └───────────┘  ││  │  │  (Log shipper)   │  │  │ │
│  │  └─────────────────────────────────┘│  └────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌──── cyber_range_net (172.20.0.0/16) ────┐  ┌── iot_range_net ─────┐ │
│  │            (Isolated)                    │  │   (172.21.0.0/16)    │ │
│  │  ┌──────────────┐  ┌─────────────┐      │  │  ┌────────────────┐  │ │
│  │  │Metasploitable│  │  Attacker   │      │  │  │  IoT Target    │  │ │
│  │  │  (Target)    │  │ (Kali tools)│      │  │  │  (Sensor Hub)  │  │ │
│  │  │ 172.20.0.2   │  │ 172.20.0.3  │      │  │  │  172.21.0.2    │  │ │
│  │  └──────────────┘  └─────────────┘      │  │  └────────────────┘  │ │
│  │  ┌──────────────┐                       │  │  ┌────────────────┐  │ │
│  │  │ Range Logger │                       │  │  │IoT Range Logger│  │ │
│  │  │ (tcpdump)    │                       │  │  │  (tcpdump)     │  │ │
│  │  │ 172.20.0.4   │                       │  │  │  172.21.0.3    │  │ │
│  │  └──────────────┘                       │  │  └────────────────┘  │ │
│  └─────────────────────────────────────────┘  └──────────────────────┘ │
│                                                                         │
│  ┌──────────────── Dynamic Containers ──────────────────────────────┐   │
│  │  Researcher Lab (per-user Ubuntu containers with security tools) │   │
│  │  Connected to: cityshield_network + cyber_range_net + iot_range  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Network Isolation Model

| Network | Subnet | Type | Purpose |
|---|---|---|---|
| `cityshield_network` | 172.22.0.0/16 | Bridge | Main service communication; all services connected |
| `cyber_range_net` | 172.20.0.0/16 | Internal | Isolated offensive training; Metasploitable + Attacker + Range Logger |
| `iot_range_net` | 172.21.0.0/16 | Internal | Isolated IoT training; IoT Target + IoT Range Logger |

The `internal: true` flag on training networks prevents external routing, ensuring that offensive operations remain contained within the platform boundary.

### 2.3 Data Store

OpenSearch 2.11 serves as the unified data store, replacing traditional relational databases. All platform state — logs, alerts, rules, users, scenarios, audit trails — is stored as indexed documents.

**Index Catalog:**

| Index | Purpose | Write Source |
|---|---|---|
| `logs-traffic` | Traffic simulator events | traffic_sim |
| `logs-iot` | IoT sensor events | iot_sim |
| `logs-network` | Network emulator events | network_emulator |
| `alerts` | Detection engine alerts | detection_engine |
| `rules` | Detection rule definitions | Backend API |
| `scenarios` | Attack scenario templates | Backend API (seeded on startup) |
| `scenario_runs` | Scenario execution state | Backend API + scenario_runner |
| `users` | User accounts (bcrypt hashed) | Backend API |
| `city-assets` | City infrastructure inventory | Backend API (seeded on startup) |
| `action-audit-log` | Response action execution log | Backend API + response_manager |
| `attack-proposals` | Researcher-submitted proposals | Backend API |

### 2.4 Data Flow Pipeline

```
Simulators ──→ OpenSearch (logs-*) ──→ Detection Engine ──→ OpenSearch (alerts)
                                                                    │
                                                                    ▼
                                                          Response Manager
                                                                    │
                                                          ┌─────────┴──────────┐
                                                          ▼                    ▼
                                                   Ansible Playbook    Audit Log Entry
                                                   (block_ip, etc.)   (action-audit-log)
```

Additionally:
- **Filebeat** ships JSONL log files (written by simulators to a shared Docker volume) to OpenSearch as a secondary ingestion pipeline.
- **WebSocket** (`/ws/city-telemetry`) pushes real-time asset status updates to the frontend.
- **REST API** (`/api/*`) serves all CRUD operations, with 5-second polling intervals for dashboard data.

---

## 3. Role-Based Access Control Model

CityShield implements three roles with hierarchical permissions enforced via JWT-based authentication and backend RBAC decorators.

### 3.1 Role Definitions

| Role | Description | Primary Responsibilities |
|---|---|---|
| **Administrator** | Platform owner and operator | User management, system configuration, proposal approval, full platform oversight |
| **Analyst** | SOC operator and incident handler | Alert triage, threat investigation, manual response action execution, case management |
| **Researcher** | Offensive security researcher | Scenario design and execution, attack proposal submission, lab-based penetration testing, rule development |

### 3.2 Capability Matrix

| Capability | Administrator | Analyst | Researcher |
|---|---|---|---|
| View Dashboard & 3D City | Yes | Yes | Yes |
| View Alerts | Yes | Yes | Yes |
| Triage & Investigate Alerts | Yes | Yes | No |
| Execute Manual Response Actions | Yes | Yes | No |
| View Action Audit Log | Yes | Yes | Yes |
| Manage Detection Rules | Yes | No | Yes |
| Configure Auto-Response | Yes | No | Yes |
| Run Built-in Scenarios | Yes | No | Yes |
| Build Custom Scenarios | Yes | No | Yes |
| Submit Attack Proposals | No | No | Yes |
| Approve/Reject Proposals | Yes | No | No |
| Provision Research Lab | No | No | Yes |
| Manage Users (CRUD) | Yes | No | No |
| Manage Devices (Power Control) | Yes | No | No |
| View Metrics (MTTD/MTTR) | Yes | Yes | Yes |
| Access Security Awareness Training | Yes | Yes | Yes |

### 3.3 Navigation Structure by Role

The frontend dynamically renders navigation items based on the authenticated user's role:

- **All roles:** Overview, Alerts, Scenarios, Security Awareness
- **Administrator additional:** Admin Panel (user management), Device Management, Attack Proposals (approval queue)
- **Analyst additional:** (Alert actions and investigation tools within Alerts page)
- **Researcher additional:** Rules, Custom Scenario Builder, Attack Proposals (submission), Research Lab

---

## 4. Analyst Playbook: Case Management Process

This section defines the complete operational workflow for a Security Analyst, from initial alert discovery through incident closure.

### 4.1 Workflow Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  1. Monitor  │────→│  2. Triage   │────→│ 3. Investigate│────→│ 4. Respond   │
│  (Dashboard) │     │  (Classify)  │     │  (Analyze)    │     │  (Execute)   │
└─────────────┘     └──────────────┘     └───────────────┘     └──────┬───────┘
                                                                       │
                                                                       ▼
                                                               ┌──────────────┐
                                                               │ 5. Document  │
                                                               │ (Audit Trail)│
                                                               └──────────────┘
```

### 4.2 Phase 1: Monitoring and Alert Discovery

**Objective:** Maintain situational awareness of the smart city security posture.

**Procedure:**

1. **Access the Overview Dashboard** at `http://localhost:3000`
   - Review the 3D smart city visualization — buildings represent city components; color indicates status (green = normal, yellow = warning, red = critical); height reflects event volume
   - Monitor summary cards: Total Alerts, Critical Alerts, Active Devices, Active Scenarios
   - Observe the real-time event feed powered by WebSocket telemetry

2. **Navigate to the Alerts Page** (`/alerts`)
   - Alerts are displayed in a sortable, filterable table
   - Default sort: newest first (by `@timestamp`)
   - Available filters:
     - **Severity:** Low, Medium, High, Critical
     - **Status:** Open, Triaged, Resolved
     - **Rule ID:** Filter by specific detection rule
     - **Date Range:** Custom time window

3. **Prioritization Criteria:**

   | Priority | Criteria | Action |
   |---|---|---|
   | P1 — Immediate | Critical severity + active attack indicators | Investigate within 5 minutes |
   | P2 — High | High severity or multiple correlated alerts | Investigate within 15 minutes |
   | P3 — Medium | Medium severity, isolated event | Investigate within 1 hour |
   | P4 — Low | Low severity, informational | Review during scheduled triage |

### 4.3 Phase 2: Alert Triage

**Objective:** Classify the alert as true positive, false positive, or requiring escalation.

**Procedure:**

1. **Expand the alert** by clicking on it in the Alerts table
2. Navigate to the **Analysis** tab (first tab in the expanded view)
3. Review the following fields:

   | Field | Purpose |
   |---|---|
   | `rule_id` / `rule_name` | Identifies the detection rule that fired |
   | `severity` | Critical / High / Medium / Low |
   | `technique_id` / `technique_name` | MITRE ATT&CK technique mapping |
   | `source_ip` / `destination_ip` | Network actors involved |
   | `event_count` | Number of matching events in the query window |
   | `description` | Human-readable alert summary |
   | `enrichment` | Threat intelligence data (if available via AbuseIPDB) |

4. **MITRE ATT&CK Context:** The Analysis tab provides a detailed threat knowledge panel with:
   - Technique description and tactic category
   - Common attack patterns associated with the technique
   - Recommended investigation steps specific to the technique
   - Related MITRE techniques for lateral analysis

5. **Triage Decision:**
   - **True Positive:** Proceed to Phase 3 (Investigation)
   - **False Positive:** Document reasoning, consider rule tuning (coordinate with Researcher)
   - **Needs Escalation:** Flag for Administrator review

### 4.4 Phase 3: Deep Investigation

**Objective:** Understand the full scope of the incident — affected assets, attack timeline, and lateral movement.

**Procedure:**

1. **Related Events Tab** — Switch to the third tab in the expanded alert view
   - View the timeline of all raw events that contributed to the alert
   - Events are displayed chronologically with source/destination, event type, and payload details
   - Use this to reconstruct the attack sequence

2. **Cross-Reference with Other Alerts:**
   - Filter the Alerts page by `source_ip` to find other alerts from the same attacker
   - Filter by `destination_ip` to identify all targeted assets
   - Look for MITRE ATT&CK technique chains (e.g., T1046 Reconnaissance → T1110 Brute Force → T1570 Lateral Movement)

3. **Log Correlation via OpenSearch Dashboards** (port 5601):
   - Query `logs-traffic`, `logs-iot`, and `logs-network` indices directly
   - Build visualizations to identify traffic patterns and anomalies
   - Example query for investigating a source IP:
     ```json
     {
       "query": {
         "bool": {
           "must": [
             { "match": { "src_ip": "172.20.0.3" } },
             { "range": { "@timestamp": { "gte": "now-1h" } } }
           ]
         }
       }
     }
     ```

4. **Asset Impact Assessment:**
   - Check the Overview dashboard for affected city components
   - Review device status on the Device Management page (if accessible)
   - Identify whether the attack has crossed network boundaries (cyber_range → cityshield_network)

### 4.5 Phase 4: Response Action Execution

**Objective:** Contain and remediate the threat using available response actions.

**Procedure:**

1. **Navigate to the Actions Tab** (second tab in the expanded alert view)

2. **Review Available Actions:**

   | Action | Description | Effect |
   |---|---|---|
   | `block_ip` | Block attacker's IP address | Executes iptables/firewall rules via Ansible playbook |
   | `isolate_service` | Isolate compromised service | Stops the affected Docker container |
   | `revoke_token` | Revoke compromised credentials | Invalidates the user's authentication token |

3. **Execute a Response Action:**
   - Click the **Execute** button on the desired action card
   - A confirmation dialog appears with:
     - Action name and description
     - Target parameters (IP address, service name, or user ID)
     - Risk warning
     - **Required:** Check the risk acknowledgment checkbox
   - Click **Confirm** to execute

4. **Monitor Execution:**
   - The action enters `pending` status immediately
   - Response Manager picks up the action and executes the corresponding Ansible playbook
   - Status transitions: `pending` → `success` or `pending` → `failed`
   - View execution output (stdout/stderr) by clicking the execution entry in the Action History table

5. **Execution Details Modal** displays:
   - Playbook path executed
   - Start and completion timestamps
   - Full stdout/stderr output
   - Parameters used
   - Success/failure status with error details if applicable

### 4.6 Phase 5: Documentation and Closure

**Objective:** Ensure complete audit trail and incident documentation.

**Procedure:**

1. **Verify Audit Trail:**
   - All actions (manual and automated) are recorded in the `action-audit-log` OpenSearch index
   - Each entry includes: `audit_id`, `alert_id`, `rule_id`, `action_name`, `execution_type`, `triggered_by`, `status`, `parameters`, `playbook_path`, `stdout`, `stderr`, `started_at`, `completed_at`

2. **Review Action History:**
   - From the Alert's Actions tab, scroll to **Action Execution History**
   - Verify all executed actions completed successfully
   - For failed actions, review error details and retry or escalate

3. **Query Audit API for Reporting:**
   - `GET /api/actions/alert/{alert_id}/history` — All actions for this incident
   - `GET /api/actions/audit?execution_type=manual&status=success` — Filtered audit queries
   - `GET /api/actions/rule/{rule_id}/history` — Historical effectiveness of a rule's response actions

4. **Post-Incident Review:**
   - Evaluate detection timing using platform metrics (MTTD — Mean Time to Detect)
   - Evaluate response timing (MTTR — Mean Time to Respond)
   - Identify rule tuning opportunities (adjust thresholds, reduce false positives)
   - Coordinate with Researchers on improving detection coverage

### 4.7 Auto-Response Awareness

Analysts should be aware that certain alerts may have automated responses configured:

- **Indicators of automated response:** Check the alert's `response.actions[]` array for entries with `execution_type: automated` and `triggered_by: system`
- **Rate limiting:** Auto-responses are rate-limited per rule (configurable `max_executions_per_hour`), preventing runaway automation
- **Manual override:** Analysts can always execute additional manual actions even when auto-response has already fired

---

## 5. Researcher Playbook: Security Research Workflow

This section defines the complete operational workflow for a Security Researcher, from scenario design through attack execution and analysis.

### 5.1 Workflow Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Scenario  │────→│ 2. Execute   │────→│ 3. Observe   │────→│ 4. Analyze   │
│   Design     │     │   Attack     │     │  Detection   │     │   Results    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                       │
                                                          ┌────────────┴───────────┐
                                                          ▼                        ▼
                                                   ┌──────────────┐     ┌──────────────┐
                                                   │ 5. Tune      │     │ 6. Propose   │
                                                   │   Rules      │     │   New Attack │
                                                   └──────────────┘     └──────────────┘
```

### 5.2 Method A: Built-in Scenario Execution

CityShield ships with pre-configured attack scenarios seeded on backend startup (OWASP-aligned and MITRE ATT&CK-mapped).

**Procedure:**

1. **Navigate to Scenarios Page** (`/scenarios`)

2. **Browse Available Scenarios:**
   Each scenario card displays:
   - Scenario name and description
   - Severity level
   - Target simulator(s)
   - MITRE ATT&CK techniques covered
   - Expected duration

3. **Launch a Scenario:**
   - Click **Run** on the desired scenario card
   - The backend creates a `scenario_runs` document with status `pending`
   - The Scenario Runner service polls for pending runs (every 5 seconds)
   - Scenario Runner sends HTTP commands to the appropriate simulators:
     - Traffic Sim: `POST http://traffic_sim:8001/attack/start`
     - IoT Sim: `POST http://iot_sim:8002/attack/start`
     - Network Emulator: `POST http://network_emulator:8003/attack/start`

4. **Monitor Execution:**
   - Scenario status transitions: `pending` → `running` → `completed` / `failed`
   - View real-time event generation on the Overview dashboard
   - Observe alerts being generated as the Detection Engine processes attack traffic

5. **Example Built-in Scenarios:**

   | Scenario | Target | Techniques | Description |
   |---|---|---|---|
   | Network Scan | Network Emulator | T1046 | Port scanning and service enumeration |
   | IoT Anomaly | IoT Simulator | T1565 | Anomalous sensor readings and data manipulation |
   | Brute Force | Traffic Simulator | T1110 | Authentication credential guessing |
   | DDoS Attack | Network Emulator | T1498 | Distributed denial of service flood |
   | Data Exfiltration | Network Emulator | T1041 | Large data transfer to external destination |
   | Ransomware | IoT Simulator | T1486 | File encryption behavior simulation |

### 5.3 Method B: Custom Scenario Builder

For advanced research, the Custom Scenario Builder allows creating multi-phase attack scenarios.

**Procedure:**

1. **Navigate to Custom Scenario Builder** (`/custom-scenarios`)

2. **Configure Scenario Metadata:**
   - Name and description
   - Target infrastructure (Traffic, IoT, Network, or combination)
   - Overall severity classification

3. **Define Attack Phases:**
   Each phase specifies:
   - **MITRE ATT&CK Technique:** Select from 31 available techniques:
     - 4 specialized techniques with simulator-specific implementations (T1046, T1565, T1110, T1498)
     - 27 generic techniques with configurable parameters
   - **Phase Duration:** How long the attack phase runs
   - **Intensity:** Event generation rate
   - **Parameters:** Technique-specific settings (e.g., target ports for scanning, credential lists for brute force)

4. **Multi-Phase Chaining:**
   - Phases execute sequentially, simulating realistic attack kill chains
   - Example kill chain:
     ```
     Phase 1: T1046 Network Scan (Reconnaissance)     → 2 minutes
     Phase 2: T1110 Brute Force (Credential Access)    → 5 minutes
     Phase 3: T1570 Lateral Movement (Propagation)     → 3 minutes
     Phase 4: T1041 Data Exfiltration (Exfiltration)   → 5 minutes
     ```

5. **Save and Execute:**
   - Custom scenarios are persisted to the `scenarios` OpenSearch index
   - Execute using the same Run mechanism as built-in scenarios

### 5.4 Method C: Attack Proposal Workflow

For novel attack scenarios that require Administrator approval.

**Procedure:**

1. **Navigate to Attack Proposals** (`/proposals`)

2. **Submit New Proposal:**
   - **Title:** Descriptive name for the proposed attack
   - **Description:** Detailed explanation of the attack methodology
   - **Justification:** Research value and expected learnings
   - **Target Systems:** Which infrastructure components are involved
   - **MITRE Techniques:** ATT&CK technique mapping
   - **Risk Assessment:** Potential impact on platform stability

3. **Proposal Lifecycle:**
   ```
   ┌──────────┐     ┌────────────┐     ┌──────────┐
   │ Submitted │────→│ Under      │────→│ Approved │──→ Execute
   │           │     │ Review     │     │          │
   └──────────┘     └─────┬──────┘     └──────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Rejected │──→ Revise & Resubmit
                    └──────────┘
   ```

4. **After Approval:** The scenario becomes available for execution through the standard scenario execution mechanism.

### 5.5 Method D: Research Lab — Terminal-Based Penetration Testing

The Research Lab provides a personal, ephemeral Ubuntu container with pre-installed security tools for hands-on offensive research.

**Procedure:**

1. **Provision Lab Container:**
   - Navigate to **Scenarios** → **Research Lab** tab
   - Click **Launch Lab** — the backend provisions a Docker container via the Docker API
   - Container configuration:
     - Base image: Ubuntu with security tools
     - Networks: Connected to `cityshield_network`, `cyber_range_net`, and `iot_range_net`
     - Pre-installed tools: `nmap`, `hydra`, `nikto`, `curl`, `netcat`, `tcpdump`
   - Access provided via web terminal in the UI

2. **Target: Metasploitable2** (cyber_range_net — 172.20.0.2)

   **Reconnaissance:**
   ```bash
   # Service discovery
   nmap -sV 172.20.0.2

   # Full port scan
   nmap -p- 172.20.0.2

   # Vulnerability scan
   nmap --script vuln 172.20.0.2
   ```

   **Exploitation Examples:**
   ```bash
   # Test FTP anonymous access
   curl ftp://172.20.0.2/

   # SSH brute force (controlled)
   hydra -l msfadmin -P /usr/share/wordlists/rockyou.txt 172.20.0.2 ssh -t 4

   # Web application scanning
   nikto -h http://172.20.0.2
   ```

3. **Target: IoT Sensor Hub** (iot_range_net — 172.21.0.2)

   **Reconnaissance:**
   ```bash
   # Discover IoT endpoints
   curl http://172.21.0.2:8080/health
   curl http://172.21.0.2:8080/sensors
   curl http://172.21.0.2:8080/status

   # Test MQTT-like service
   nc -v 172.21.0.2 1883
   ```

   **IoT-Specific Attacks:**
   ```bash
   # Enumerate sensor configuration
   curl http://172.21.0.2:8080/config

   # Attempt sensor data manipulation
   curl -X POST http://172.21.0.2:8080/sensors -d '{"temperature": 999}'

   # Flood MQTT-like service
   for i in $(seq 1 100); do echo "PUBLISH test payload_$i" | nc -w1 172.21.0.2 1883; done
   ```

4. **Observe Detection:**
   - All lab traffic traverses monitored networks
   - Range Logger (cyber_range_net) and IoT Range Logger (iot_range_net) capture packets via tcpdump
   - Captured traffic is written to JSONL files → Filebeat ships to OpenSearch → Detection Engine evaluates
   - Switch to the Alerts page to verify whether detection rules fired

5. **Lab Lifecycle:**
   - Labs are per-user (one container per researcher)
   - Destroy the lab container when finished via the UI
   - Containers are ephemeral — no data persists between sessions

### 5.6 Detection Rule Management

Researchers can create, modify, and test detection rules.

**Procedure:**

1. **Navigate to Rules Page** (`/rules`)

2. **View Existing Rules:**
   - 25 pre-configured YAML rules covering MITRE ATT&CK techniques from T1003 to T1569
   - Each rule shows: ID, name, severity, technique mapping, enabled status

3. **Create or Modify Rules:**
   - Rules are defined in YAML format at `services/detection_engine/rules/`
   - Key fields:
     ```yaml
     rule_id: custom_001
     name: Custom Detection Rule
     enabled: true
     severity: high
     query_window_seconds: 300
     match_logic:
       type: brute_force        # See supported match logic types
       parameters:
         threshold: 10
         group_by: src_ip
         event_types:
           - authentication_failure
     technique_id: T1110
     response_actions:
       - block_ip
     log_sources:
       - logs-traffic
     ```

4. **Configure Auto-Response:**
   - In the Rule Details view, expand **Auto-Response Configuration**
   - Settings:
     - **Enable/Disable:** Toggle automated response
     - **Minimum Severity:** Only trigger for alerts at or above this level
     - **Require Enrichment:** Only execute if threat intelligence enrichment is present
     - **Max Executions Per Hour:** Rate limit (1–100)

5. **Test Detection:**
   - Run a scenario that generates matching events
   - Verify alert creation on the Alerts page
   - Check alert fields match expected values (severity, technique, source IP)
   - Evaluate false positive rate across multiple runs

### 5.7 Research Analysis

**Metrics Evaluation:**
- **MTTD (Mean Time to Detect):** Time from event generation to alert creation
- **MTTR (Mean Time to Respond):** Time from alert creation to response action completion
- **Detection Accuracy:** True positive rate across scenario runs

Access via `scripts/compute_metrics.py` or the platform's metrics API endpoint.

---

## 6. Administrator Playbook: Platform Operations

This section defines the operational workflow for the Administrator role.

### 6.1 Workflow Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Platform  │────→│ 2. User &    │────→│ 3. Monitor   │
│   Setup      │     │   Access Mgmt│     │   & Maintain │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                   │
                                          ┌────────┴────────┐
                                          ▼                 ▼
                                   ┌──────────────┐  ┌──────────────┐
                                   │ 4. Review    │  │ 5. Evaluate  │
                                   │  Proposals   │  │   Metrics    │
                                   └──────────────┘  └──────────────┘
```

### 6.2 Platform Setup and Configuration

**Initial Deployment:**

```bash
# 1. Clone repository and configure environment
cp .env.example .env
# Edit .env — set BACKEND_JWT_SECRET, admin credentials, simulator rates

# 2. Run bootstrap script (creates indices, seeds data)
./scripts/bootstrap.sh

# 3. Start all services
docker compose up --build

# 4. Verify deployment
./scripts/verify_production.sh
```

**Environment Variables:**

| Variable | Purpose | Default |
|---|---|---|
| `BACKEND_JWT_SECRET` | JWT signing key | Must be changed from default |
| `DEFAULT_ADMIN_USER` | Initial admin username | Set in .env |
| `DEFAULT_ADMIN_PASS` | Initial admin password | Set in .env |
| `USE_MOCK_CITY_COMPONENTS` | Deterministic demo data | `true` |
| `THREAT_INTEL_PROVIDER` | Threat intelligence source | `mock` or `abuseipdb` |
| `DETECTION_POLL_INTERVAL_SECONDS` | Detection engine cycle | `30` |
| `DETECTION_QUERY_WINDOW_SECONDS` | Rule evaluation lookback | `300` |

### 6.3 User and Access Management

**Procedure:**

1. **Navigate to Admin Panel** (`/admin`)

2. **User Operations:**
   - **Create User:** Set username, email, password, and role (Administrator / Analyst / Researcher)
   - **Edit User:** Modify role or email
   - **Delete User:** Remove user account
   - **View Users:** Table with username, role, email, and creation date

3. **Default Accounts (created on startup):**

   | Username | Role | Purpose |
   |---|---|---|
   | `${DEFAULT_ADMIN_USER}` | Administrator | Platform management |
   | `researcher` | Researcher | Security research |

### 6.4 Device and Infrastructure Management

**Procedure:**

1. **Navigate to Device Management** (`/devices`)

2. **City Asset Management:**
   - View all registered city infrastructure components
   - Each asset shows: name, type, status, location, network, last telemetry timestamp
   - **Power Control:** Toggle device power state (simulated on/off)
   - Assets include: traffic controllers, IoT sensors, network equipment, surveillance cameras

3. **3D Visualization Monitoring:**
   - The Overview page renders a React Three Fiber 3D city scene
   - Building height = relative event count
   - Building color = operational status (green/yellow/red)
   - Real-time updates via WebSocket feed

### 6.5 Proposal Review Process

**Procedure:**

1. **Navigate to Attack Proposals** (`/proposals`)

2. **Review Queue:**
   - View pending proposals submitted by Researchers
   - Each proposal contains: title, description, justification, target systems, MITRE techniques, risk assessment

3. **Decision Criteria:**

   | Factor | Approve | Reject |
   |---|---|---|
   | Research value | Clear learning objectives | Vague or redundant |
   | Risk assessment | Contained within training networks | Potential to affect production services |
   | MITRE coverage | Tests untested techniques | Duplicates existing scenarios |
   | Justification | Well-reasoned methodology | Insufficient detail |

4. **Actions:**
   - **Approve:** Proposal becomes executable as a scenario
   - **Reject:** Provide feedback for revision; researcher may resubmit

### 6.6 Metrics and Evaluation

**Platform Metrics:**

| Metric | Definition | Source |
|---|---|---|
| MTTD | Mean Time to Detect (event → alert) | `logs-*` and `alerts` timestamps |
| MTTR | Mean Time to Respond (alert → action completion) | `alerts` and `action-audit-log` timestamps |
| Detection Accuracy | True positive / (True positive + False positive) | Alert analysis |
| Rule Coverage | % of MITRE ATT&CK techniques covered | Rule definitions |
| Response Success Rate | Successful / Total action executions | `action-audit-log` index |

**Computing Metrics:**
```bash
# Automated computation script
python scripts/compute_metrics.py

# Manual query via API
GET /api/metrics?period=24h
```

---

## 7. Detection Methodology

### 7.1 Rule Engine Architecture

The Detection Engine (`services/detection_engine/`) implements a polling-based detection model:

1. **Load Phase:** YAML rule files from `rules/` directory are parsed into memory
2. **Query Phase:** For each enabled rule, construct an OpenSearch query against specified `log_sources` within `query_window_seconds`
3. **Evaluation Phase:** Apply `match_logic` (aggregation, threshold comparison, pattern matching)
4. **Alert Phase:** If threshold is met, create an alert document in the `alerts` index
5. **Enrichment Phase:** Optionally enrich alert with threat intelligence (AbuseIPDB)
6. **Sleep Phase:** Wait `DETECTION_POLL_INTERVAL_SECONDS` (default 30s) before next cycle

### 7.2 Match Logic Types

The rule engine supports 25 distinct match logic types, each implementing a specific detection algorithm:

| Category | Match Types | Detection Method |
|---|---|---|
| Reconnaissance | `net_scan` | Distinct destination port count per source IP |
| Credential Access | `brute_force`, `credential_dump` | Failed authentication count; credential access event detection |
| Command & Control | `c2_beacon` | Periodic connection interval analysis |
| Exfiltration | `data_exfiltration`, `data_archiving` | Byte transfer volume; archiving behavior detection |
| Impact | `ddos_attack`, `dos_endpoint`, `ransomware` | Multi-source aggregation; resource exhaustion; encryption events |
| Execution | `cmd_execution`, `powershell_execution`, `service_execution` | Suspicious command patterns |
| Persistence | `registry_persistence`, `service_persistence`, `scheduled_task_creation`, `account_creation` | System modification detection |
| Defense Evasion | `defense_evasion`, `obfuscation_detection`, `log_clearing`, `token_manipulation` | Security tool tampering; obfuscated patterns |
| Lateral Movement | `lateral_movement` | Service-to-service propagation detection |
| Collection | `screen_capture` | Screen capture API usage detection |
| IoT-Specific | `iot_anomaly` | Anomalous sensor reading detection |
| Web-Specific | `web_exploit` | SQL injection, XSS, command injection pattern matching |

### 7.3 MITRE ATT&CK Coverage

CityShield's 25 detection rules map to 25 unique MITRE ATT&CK techniques spanning 11 tactics:

| Tactic | Techniques Covered |
|---|---|
| Reconnaissance | T1046 |
| Credential Access | T1003, T1110 |
| Command and Control | T1071 |
| Exfiltration | T1041 |
| Impact | T1486, T1498, T1499 |
| Initial Access | T1190 |
| Execution | T1059.001, T1059.003, T1569.002 |
| Persistence | T1053.005, T1136.001, T1543.003, T1547.001 |
| Defense Evasion | T1027, T1070.001, T1134, T1562.001 |
| Lateral Movement | T1570 |
| Collection | T1113 |
| Data Staging | T1560.001 |

### 7.4 Automated Response Pipeline

```
Alert Created ──→ Response Manager Poll ──→ Auto-Response Check
                                                     │
                                          ┌──────────┴──────────┐
                                          │ Condition Validation │
                                          │ • Severity ≥ min    │
                                          │ • Enrichment check  │
                                          │ • Rate limit check  │
                                          └──────────┬──────────┘
                                                     │
                                            ┌────────┴────────┐
                                            ▼                 ▼
                                     Conditions Met    Conditions Not Met
                                            │                 │
                                            ▼                 ▼
                                    Execute Playbook    Skip (log reason)
                                            │
                                            ▼
                                    Create Audit Entry
                                    (action-audit-log)
```

**Available Playbooks** (mapped in `services/response_manager/playbooks_map.yml`):

| Playbook | Action | Effect |
|---|---|---|
| `block_ip.yml` | `block_ip` | iptables rule to drop traffic from malicious IP |
| `isolate_service.yml` | `isolate_service` | Docker stop on compromised container |
| `revoke_token.yml` | `revoke_token` | Invalidate user authentication session |

---

## 8. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | React | 18.x | UI framework |
| Frontend | TypeScript | 5.x | Type safety |
| Frontend | Vite | 5.x | Build tool and dev server |
| Frontend | React Three Fiber | — | 3D city visualization |
| Frontend | nginx | — | Production static file serving |
| Backend | Python | 3.11 | Runtime |
| Backend | FastAPI | — | REST API framework |
| Backend | PyJWT + bcrypt | — | Authentication |
| Data Store | OpenSearch | 2.11.1 | Log storage, alerting, state management |
| Visualization | OpenSearch Dashboards | 2.11.1 | Log analysis and visualization |
| Log Shipping | Filebeat | 7.17.18 | JSONL → OpenSearch pipeline |
| Automation | Ansible | — | Response playbook execution |
| Containers | Docker Compose | 2.x+ | Service orchestration |
| CI/CD | GitHub Actions | — | Automated testing and validation |

---

## 9. Security Awareness Training Module

CityShield includes a built-in Security Awareness Training module accessible to all roles, providing role-specific cybersecurity education.

### 9.1 Training Categories

| Category | Target Audience | Focus Areas |
|---|---|---|
| **Employees** | General workforce | Phishing, password hygiene, social engineering, data protection |
| **Executives** | C-suite and management | Strategic risk, compliance, incident communication, business continuity |
| **IT/Technical Staff** | Engineers and administrators | Network security, secure coding, incident response, cloud security |

### 9.2 Module Structure

Each category provides:
- **Training Modules:** 4 structured lessons with objectives, key concepts, and practical guidelines
- **Interactive Scenarios:** Role-specific situational exercises simulating real-world threats
- **Knowledge Assessment:** 5-question quiz with immediate scoring and pass/fail feedback (80% threshold)

---

## 10. Deployment and Operations

### 10.1 Prerequisites

| Requirement | Specification |
|---|---|
| Docker Desktop | 4.x+ with Compose 2.x+ |
| RAM | 8 GB minimum, 16 GB recommended |
| Disk Space | 20 GB+ (container images + OpenSearch data) |
| Linux Kernel | `vm.max_map_count=262144` (OpenSearch requirement) |

### 10.2 Service Ports

| Service | Port | Access |
|---|---|---|
| Frontend | 3000 | `http://localhost:3000` |
| Backend API | 8000 | `http://localhost:8000/docs` (Swagger) |
| OpenSearch | 9200 | `http://localhost:9200` |
| OpenSearch Dashboards | 5601 | `http://localhost:5601` |
| Traffic Simulator | 8001 | Internal |
| IoT Simulator | 8002 | Internal |
| Network Emulator | 8003 | Internal |

### 10.3 Health Verification

```bash
# Platform health check
./scripts/verify_production.sh

# Cyber range component check
./scripts/verify_cyber_range.sh

# Individual service health
curl http://localhost:8000/api/health       # Backend
curl http://localhost:9200/_cluster/health   # OpenSearch
curl http://localhost:8001/health            # Traffic Simulator
curl http://localhost:8002/health            # IoT Simulator
curl http://localhost:8003/health            # Network Emulator
```

---

## 11. CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) executes on push and pull requests to `main` and `develop` branches:

| Job | Purpose | Command |
|---|---|---|
| `lint-backend` | Python code quality | `ruff check app/` |
| `test-backend` | Unit and integration tests | `pytest tests/ -v` |
| `validate-docker` | Compose file validation | `docker compose config` |
| `lint-frontend` | TypeScript/React linting | `npm run lint` |
| `build-frontend` | Production build verification | `npm run build` |

---

## 12. Challenges and Solutions

| Challenge | Solution |
|---|---|
| Multi-domain event correlation across heterogeneous log sources | Unified OpenSearch indices with standardized event schemas |
| Network isolation for offensive training without external exposure | Docker internal networks with `internal: true` flag |
| Real-time dashboard updates without excessive polling | WebSocket channel (`/ws/city-telemetry`) for push-based telemetry |
| Preventing runaway automated responses | Per-rule rate limiting (`max_executions_per_hour`) with audit trail |
| Reproducible attack scenarios across sessions | Scenario templates stored in OpenSearch, executed via HTTP API to simulators |
| Per-user isolated research environments | Dynamic Docker container provisioning via backend Docker API integration |
| Browser compatibility for modern CSS in inline styles | `hexAlpha()` utility replacing `color-mix()` for cross-browser rgba computation |

---

## 13. Conclusion

CityShield provides a comprehensive, self-contained cyber range platform specifically designed for smart city cybersecurity training and research. By combining realistic multi-domain simulation, MITRE ATT&CK-aligned detection, automated response orchestration, and role-specific operational workflows, the platform enables practical hands-on experience across the full incident lifecycle — from threat generation through detection, response, and post-incident analysis.

The platform's containerized architecture ensures reproducibility and portability, while its role-based access model supports concurrent training for analysts, researchers, and administrators. The immutable audit trail and metrics computation capabilities provide the evidentiary basis for evaluating detection effectiveness and response efficiency.

---

## References

1. MITRE ATT&CK Framework — https://attack.mitre.org/
2. OpenSearch Documentation — https://opensearch.org/docs/latest/
3. OWASP Top Ten — https://owasp.org/www-project-top-ten/
4. Docker Compose Specification — https://docs.docker.com/compose/
5. FastAPI Documentation — https://fastapi.tiangolo.com/
6. Ansible Documentation — https://docs.ansible.com/
7. NIST Cybersecurity Framework — https://www.nist.gov/cyberframework

---

*CityShield — Smart City Cyber Range Platform*
*Version 1.0 | April 2026*
