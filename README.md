# CityShield Platform

**Simulating and Defending Smart City Cyberattacks**

CityShield is a secure, scalable, interactive smart city cyber range for training, testing, and evaluating cybersecurity defenses. It deploys modular smart-city domain microservices, simulates realistic cyber-attack scenarios, provides centralized logging and monitoring, detects threats using rule-based detection aligned to MITRE ATT&CK, integrates live threat intelligence enrichment, and executes automated response playbooks.

## Features

- **Modular Simulation Layer**: Traffic management, IoT sensors, and network emulator services that generate realistic event streams
- **Cyber Range**: Isolated attack/defense lab with a real Metasploitable target and Kali-based attacker container, with live packet capture via `range_logger`
- **IoT Range**: Isolated IoT sensor hub training target with HTTP management interface and MQTT-like listener, reachable from the Research Lab terminal
- **Centralized Logging**: Filebeat ships logs to OpenSearch for analysis
- **Threat Detection**: 25 rule-based detection rules with MITRE ATT&CK mapping and optional threat intelligence enrichment (AbuseIPDB)
- **MITRE ATT&CK Techniques**: 31 techniques with tactic mapping, available as configurable attack techniques in the Custom Scenario Builder
- **OWASP Top 10 Scenarios**: 10 built-in OWASP-aligned training scenarios (A01-A10:2021) that generate simulated attack traffic
- **Automated Response**: Python-based response manager executes Ansible playbooks for containment actions
- **Interactive 3D City Visualization**: Real-time 3D smart city powered by Three.js / React Three Fiber with 6 zones (Traffic, IoT, Network, Security, Industrial, Cyber Range), orbit controls, hover/click interactions, and live data-driven building states. Includes Metasploitable VM as a dedicated building in the Cyber Range zone
- **Live Attack Visualization**: When a scenario runs, the 3D map shows real-time attack progress with selective building flash — only the targeted district's buildings pulse red with dramatic effects (scale pulsing, red point light, rotating ground ring). Non-targeted buildings remain normal
- **Real-Time Alert Pipeline**: Alerts are generated in real-time as attack stages complete, with accelerated polling (2s) during active attacks and an "Attack in Progress" banner on the Alerts page
- **Attack Scenario Engine**: 21+ built-in scenarios (including 10 OWASP) with real-time stage progression, 4-stage execution per scenario, and live progress tracking in the UI
- **Attack Proposals**: Researchers submit attack proposals for admin approval before they become executable scenarios
- **Interactive Web UI**: React-based dashboard for monitoring, alert investigation, scenario management, and MITRE technique reference
- **Device Power Control**: Administrators can toggle devices on/off from the Device Management page or the 3D Asset Inspector, with real-time visual feedback in the 3D city
- **Employee Cybersecurity Awareness Training Module**: Interactive security training portal (`/awareness`) with phishing, passwords, data protection, and incident reporting modules plus a 5-question knowledge check with pass/fail scoring
- **Role-Based Access Control**: Administrator, Analyst, and Researcher roles with appropriate permissions
- **Evaluation Metrics**: MTTD, MTTR, detection accuracy, false positive rate, and resource utilization tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                         │
│  Dashboard │ Alerts │ Scenarios │ Devices │ 3D City Map        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                Backend API (FastAPI + JWT + RBAC)                │
│  Auth │ Users │ Rules │ Scenarios │ Alerts │ Metrics │ WS      │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                Data Layer (OpenSearch + Dashboards)              │
│  logs-* │ alerts │ rules │ scenarios │ users │ city-assets      │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ├──────────────────┬─────────────────┬──────────────────┐
           ▼                  ▼                 ▼                  ▼
    ┌────────────┐     ┌────────────┐    ┌──────────┐    ┌──────────────┐
    │ Detection  │     │  Response  │    │ Scenario │    │   Filebeat   │
    │  Engine    │     │  Manager   │    │  Runner  │    │ Log Shipper  │
    └────────────┘     └────────────┘    └──────────┘    └──────┬───────┘
                                                                  │
           ┌──────────────────────────────────────────────────────┘
           │
           ├────────────────┬────────────────┐
           ▼                ▼                ▼
    ┌────────────┐   ┌────────────┐   ┌──────────────┐
    │  Traffic   │   │    IoT     │   │   Network    │
    │ Simulator  │   │ Simulator  │   │  Emulator    │
    └────────────┘   └────────────┘   └──────────────┘

    ┌──────── Cyber Range (isolated network) ────────┐
    │  ┌──────────┐   ┌───────────────┐              │
    │  │ Attacker │──▶│ Metasploitable│              │
    │  │  (Kali)  │   │  (Target)     │              │
    │  └──────────┘   └───────────────┘              │
    │       ▲ tcpdump                                 │
    │  ┌──────────┐                                   │
    │  │  Range   │──▶ Filebeat ──▶ OpenSearch        │
    │  │  Logger  │                                   │
    │  └──────────┘                                   │
    └─────────────────────────────────────────────────┘

    ┌──────── IoT Range (isolated network) ─────────┐
    │  ┌────────────────┐                            │
    │  │   IoT Target   │  HTTP :8080 + TCP :1883    │
    │  │  (Sensor Hub)  │                            │
    │  └────────────────┘                            │
    │       ▲ tcpdump                                │
    │  ┌──────────────┐                              │
    │  │ IoT Range    │──▶ Filebeat ──▶ OpenSearch   │
    │  │   Logger     │                              │
    │  └──────────────┘                              │
    └────────────────────────────────────────────────┘
```

## Prerequisites

- Docker Desktop 4.x or later
- Docker Compose 2.x or later
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space
- **Linux (native only)**: If running Docker on a native Linux host, OpenSearch requires:
  `sudo sysctl -w vm.max_map_count=262144` 
  (Not required on macOS or Windows when using Docker Desktop.)

## Quick Start

### 1. Clone, Bootstrap, and Start

```bash
git clone https://github.com/SamiAhmedQMUL/CityShield.git
cd CityShield

# Bootstrap: copies .env.example → .env, starts OpenSearch, creates indices
./scripts/bootstrap.sh

# Start all services (detached, with build)
docker compose up -d --build
```

Wait for all services to become healthy (2-3 minutes). Core services:

| Service | Port | Purpose |
|---|---|---|
| `frontend` | 3000 | React UI (nginx) |
| `backend` | 8000 | FastAPI + WebSocket |
| `opensearch` | 9200 | Data store |
| `dashboards` | 5601 | OpenSearch Dashboards |
| `traffic_sim` | 8001 | Traffic event simulator |
| `iot_sim` | 8002 | IoT event simulator |
| `network_emulator` | 8003 | Network event simulator |
| `detection_engine` | — | MITRE ATT&CK rule engine |
| `response_manager` | — | Ansible playbook executor |
| `scenario_runner` | — | Scenario orchestration |
| `filebeat` | — | Log shipper |
| `metasploitable` | — | Vulnerable training target |
| `attacker` | — | Kali Linux attack container |
| `range_logger` | — | Cyber range packet capture |
| `iot_target` | — | IoT sensor hub training target |
| `iot_range_logger` | — | IoT range packet capture |

### 2. Access the Platform

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **OpenSearch Dashboards**: http://localhost:5601

**Default Login Credentials**:

| Account | Username | Password | Role |
|---|---|---|---|
| Administrator | `admin` | `CityShield@Admin2026` | Full platform access |
| Researcher | `researcher` | `CityShield@Researcher2026` | Scenarios, proposals, research lab |

Both accounts are seeded automatically on first startup (idempotent — safe to restart). Credentials are configured via environment variables in `.env` (`DEFAULT_ADMIN_*` / `DEFAULT_RESEARCHER_*`).

**To change passwords**: Login as Administrator, navigate to **Admin > Users**, select the user, and update their password. To disable an account, toggle its **Active** status to inactive.

**IMPORTANT**: Change the default passwords immediately after first login!

### 3. Verify the Platform

```bash
# Check all containers are running
docker compose ps

# Backend health
curl -s http://localhost:8000/api/health | python3 -m json.tool

# OpenSearch health
curl -s http://localhost:9200/_cluster/health | python3 -m json.tool

# Frontend serves (should return HTML)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

## Using CityShield

### Running Attack Scenarios

1. Login to the web UI at http://localhost:3000
2. Navigate to **Scenarios**
3. Select a built-in scenario (11 available):

| Scenario | Pattern | Target | Severity |
|---|---|---|---|
| SSH Brute Force Attack | Brute Force | Traffic Management | High |
| DDoS Against Traffic Control | DDoS | Traffic Management | Critical |
| Network Reconnaissance - Port Scan | Port Scan | Network Infrastructure | Medium |
| IoT Botnet Recruitment | Malware | IoT Sensors | Critical |
| Ransomware Attack on Traffic Systems | Ransomware | Traffic Management | Critical |
| Man-in-the-Middle Attack | Data Exfiltration | Network Infrastructure | High |
| Sensor Overload DoS | DoS | IoT Sensors | High |
| Cryptojacking IoT Devices | Resource Hijacking | IoT Sensors | Medium |
| SCADA System Compromise | Data Exfiltration | Industrial Systems | Critical |
| Wind Farm Controller Takeover | Malware | Industrial Systems | Critical |
| **Cyber Range: Port Scan** | Port Scan | **Metasploitable** | High |

4. Click **Run Scenario** — the 3D city map automatically shows the attack in progress:
   - The targeted district's buildings flash red with dramatic pulsing effects
   - An attack panel overlay displays real-time stage progression, phase timeline, and explanations
   - Alerts are generated in real-time as each stage completes
5. Navigate to **Alerts** to see detected threats (polls every 2s during active attacks, with an "Attack in Progress" banner)
6. Navigate to **OpenSearch Dashboards** (http://localhost:5601) to query logs

## User Roles

| Role | Permissions |
|------|-------------|
| **Administrator** | Manage users, system configuration, toggle device power on/off, approve attack proposals, view all resources |
| **Analyst** | View alerts and logs, investigate incidents, update alert status, execute response actions |
| **Researcher** | Create scenarios, submit attack proposals, manage rules, run simulations, manage research lab |

## Attack Proposals

Researchers can submit attack proposals that require Administrator approval before becoming executable scenarios:

1. Navigate to **Proposals** in the UI
2. Click **Submit Proposal** — fill in title, description, target component, attack pattern, and optionally select MITRE techniques
3. The proposal appears as **pending** for the admin
4. Admin reviews and clicks **Approve** (creates a scenario) or **Reject** (with optional comment)
5. Approved proposals appear in the Scenario Builder for execution

**API Endpoints:**
- `POST /api/proposals` — Submit proposal (Researcher/Admin)
- `GET /api/proposals` — List proposals (filtered by role)
- `PUT /api/proposals/{id}/review` — Approve/reject (Admin only)

## MITRE ATT&CK Techniques

The platform includes 31 MITRE ATT&CK techniques, each available as a configurable attack technique in the **Custom Scenario Builder**. Every technique has unique, purpose-specific parameters (e.g., credential dumping has dump source/tool selection, process injection has injection method/target processes).

When creating a custom scenario, you can select MITRE techniques from a searchable multi-select. Selected technique IDs are persisted with the scenario and displayed as chips on scenario cards in the scenario list.

**API Endpoints:**
- `GET /api/mitre/techniques` — Full technique list (supports `?search=` and `?tactic=` query params)
- `GET /api/scenarios/attack-techniques` — All 31 techniques with configurable parameters

## OWASP Top 10 Scenarios

10 built-in OWASP-aligned scenarios (A01-A10:2021) are seeded on startup:

| Scenario | OWASP ID | Attack Pattern |
|---|---|---|
| Broken Access Control | A01:2021 | Brute Force |
| Cryptographic Failures | A02:2021 | Data Exfiltration |
| Injection | A03:2021 | Port Scan |
| Insecure Design | A04:2021 | Port Scan |
| Security Misconfiguration | A05:2021 | Port Scan |
| Vulnerable Components | A06:2021 | Port Scan |
| Authentication Failures | A07:2021 | Brute Force |
| Integrity Failures | A08:2021 | Malware |
| Logging Failures | A09:2021 | Data Exfiltration |
| SSRF | A10:2021 | Port Scan |

These appear in the Scenario Builder with an **OWASP** badge.

## Detection Rules

CityShield includes 25 detection rules mapped to MITRE ATT&CK, including:

| Rule | Technique | Tactic | Severity |
|---|---|---|---|
| Brute Force Authentication | T1110 | Credential Access | High |
| Active Scanning - Port Scan | T1595.001 | Reconnaissance | Medium |
| Network Denial of Service | T1498 | Impact | Critical |
| Application Layer Protocol Abuse | T1071.001 | Command and Control | High |
| Network Port Scan Detection | T1046 | Discovery | High |
| Data Exfiltration Detection | T1041 | Exfiltration | Critical |
| Data Encrypted for Impact | T1486 | Impact | Critical |

See [docs/detection-rules.md](docs/detection-rules.md) for details on creating custom rules.

## Response Actions

Automated response playbooks include:

- **block_ip**: Block malicious IP addresses using simulated firewall rules
- **isolate_service**: Quarantine compromised services
- **revoke_token**: Revoke user authentication tokens

See [docs/response-playbooks.md](docs/response-playbooks.md) for details.

## Project Structure

```
cityshield/
├── backend/              # FastAPI backend application
│   ├── app/              # Application code
│   │   ├── api/          # API routes
│   │   ├── core/         # Security, config, RBAC
│   │   ├── db/           # OpenSearch client
│   │   ├── models/       # Pydantic models
│   │   └── services/     # Business logic
│   └── tests/            # Backend tests
├── frontend/             # React frontend application
│   └── src/              # Frontend source code
├── services/             # Microservices
│   ├── simulators/       # Traffic, IoT, network simulators
│   ├── detection_engine/ # Threat detection service
│   ├── response_manager/ # Automated response service
│   ├── scenario_runner/  # Scenario orchestration service
│   ├── attacker/         # Kali-based attack container (nmap, netcat, etc.)
│   ├── range_logger/     # tcpdump-based cyber range packet capture
│   ├── iot_target/       # IoT sensor hub training target (HTTP + MQTT)
│   ├── iot_range_logger/ # tcpdump-based IoT range packet capture
│   └── researcher-lab/   # Per-user Ubuntu lab container (provisioned via UI)
├── infrastructure/       # Infrastructure configuration
│   ├── filebeat/         # Filebeat log shipping config
│   ├── dashboards/       # OpenSearch Dashboards exports
│   └── ansible/          # Ansible playbooks for response
├── data/                 # Data directory
│   ├── logs/             # Simulator log outputs
│   ├── datasets/         # Generated labeled datasets
│   └── sample/           # Sample data
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── docker-compose.yml    # Docker Compose configuration
└── .env.example          # Example environment configuration
```

## 3D Smart City Visualization

The Overview dashboard features an interactive 3D city where each building represents a smart city asset. Buildings are grouped into six zones:

| Zone | Color | Assets |
|---|---|---|
| Traffic Management | Red | Traffic controllers, cameras, signals |
| IoT Sensors | Green | Environmental, water, air quality sensors |
| Network Infrastructure | Blue | Firewalls, switches, DNS, VPN |
| Security Operations | Purple | SIEM, EDR, scanners, auth servers |
| Industrial Systems | Orange | SCADA, PLCs, turbines, grid controllers |
| **Cyber Range** | **Orange-Red** | **Metasploitable VM (172.20.0.2)** |

- **Building height** reflects risk score (derived from alert count)
- **Building color** reflects status: green (ok), amber (warning), red+glow (critical), gray (offline)
- **Attack visualization**: Only the targeted district's buildings flash red during an attack, with dramatic visual effects:
  - Bright pulsing red emissive glow (intensity 1.5–5.0)
  - Scale pulsing (throb effect) on attacked buildings
  - Red point light hovering above attacked buildings (intensity 8–20)
  - Rotating, pulsing red ground ring at the base
  - Red edge outlines and roof accent
- **Attack panel overlay**: Shows real-time stage progression, phase timeline, target info, and attack explanations
- **Interactions**: Orbit/pan/zoom camera, hover for tooltips, click for asset inspector panel
- **Data source**: Live WebSocket stream from `city-assets` index (2s refresh) + REST fallback

See [docs/smart-city-3d.md](docs/smart-city-3d.md) for full technical details.

## Device Management

The platform includes 25 smart city assets across 6 zones, each with detection rules, network metadata, and real-time status monitoring. All assets are stored in the `city-assets` OpenSearch index.

### Device Power Control (Admin Only)

Administrators can toggle devices on/off from two locations:

1. **Device Management page** (`/devices`) — toggle switch in the Actions column of each device row, and in the detail panel under Admin Actions
2. **3D Asset Inspector** — click any building in the 3D city, then use the "Device Power" toggle in the SOC Actions section

When a device is toggled off:
- Its status changes from `active` to `inactive` in OpenSearch
- The 3D building turns **gray** (offline) within ~2 seconds via WebSocket
- The toggle provides optimistic feedback (flips immediately, reconciles on next data push)

### Asset Data

Each asset includes: `status`, `device_type`, `lifecycle_state`, `criticality`, `detection_rules`, network info, and zone placement. To reload or reset asset data:

```bash
./scripts/create_assets_simple.sh
docker compose restart backend
```

See [docs/device-inventory.md](docs/device-inventory.md) for the complete 25-asset inventory with schema reference.

## Frontend Routes

| Path | Page | Access |
|---|---|---|
| `/` | Overview (dashboard + 3D city) | All authenticated |
| `/alerts` | Alert investigation | All authenticated |
| `/rules` | Detection rules + auto-response config | All authenticated |
| `/scenarios` | Scenario builder + Research Lab tab | All authenticated |
| `/scenarios/custom` | Custom scenario builder (MITRE selection) | All authenticated |
| `/devices` | Device management + power control | All authenticated |
| `/awareness` | Security awareness training + quiz | All authenticated |
| `/proposals` | Attack proposals (submit / review) | All authenticated |
| `/admin/users` | User management | Administrator only |
| `/login` | Login | Public |

## Key Frontend Dependencies

| Package | Version | Purpose |
|---|---|---|
| `three` | ^0.160.0 | 3D rendering engine |
| `@react-three/fiber` | ^8.15.12 | React Three.js renderer |
| `@react-three/drei` | ^9.93.0 | Camera controls, helpers |
| `@react-three/postprocessing` | ^2.16.2 | Optional bloom/glow effects |
| `animejs` | ^3.2.1 | UI panel animations |
| `framer-motion` | ^11.x | Page transitions and attack panel animations |

## Documentation

- [3D Smart City](docs/smart-city-3d.md) - Scene structure, data mapping, performance, and extensions
- [Architecture](docs/architecture.md) - System architecture and component descriptions
- [Threat Model](docs/threat-model.md) - Threat modeling and security considerations
- [Log Schema](docs/log-schema.md) - Log event schema specification
- [Detection Rules](docs/detection-rules.md) - Detection rule format and examples
- [Response Playbooks](docs/response-playbooks.md) - Automated response playbook details
- [Scenarios](docs/scenarios.md) - Scenario definitions and creation guide
- [API Documentation](docs/api.md) - REST API endpoints reference
- [Dashboards](docs/dashboards.md) - Dashboard configuration and usage
- [Attack Execution](docs/attack-execution.md) - Real attack execution engine guide
- [Device Inventory](docs/device-inventory.md) - Complete 25-asset inventory with schema and detection rules
- [OpenSearch Integration](docs/opensearch-integration.md) - OpenSearch Dashboards deep-dive investigation

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Lint backend
ruff check app/

# Frontend lint and type-check
cd frontend
npm run lint
npm run build     # includes tsc type-check
```

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
  type: net_scan
  parameters:
    threshold: 5
    field: dst_port
    group_by: src_ip
technique_id: T1046
technique_name: Network Service Scanning
response_actions:
  - block_ip
```

Restart the detection engine to load the new rule.

## Troubleshooting

### OpenSearch won't start or keeps restarting

**Linux**: OpenSearch requires a higher virtual memory limit:

```bash
sudo sysctl -w vm.max_map_count=262144
# Make permanent:
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

**Low memory**: OpenSearch needs at least 4GB. Increase Docker Desktop memory allocation in Settings → Resources → Memory.

Check health: `curl -s http://localhost:9200/_cluster/health | python3 -m json.tool`

### Port conflicts (address already in use)

Find what's using a port and stop it, or change the port in `.env`:

```bash
lsof -i :9200   # OpenSearch
lsof -i :8000   # Backend
lsof -i :3000   # Frontend
```

### Backend returns errors or login fails

Restart the backend so it reconnects to OpenSearch and re-seeds default users:

```bash
docker compose restart backend
```

If OpenSearch is down:

```bash
docker compose up -d opensearch
# Wait for it to become healthy (~30s), then:
docker compose restart backend
```

### Research Lab tools or banner are outdated

Rebuild the image and re-provision:

```bash
docker compose build researcher-lab-image
```

Then in the UI: Scenarios → Research Lab → **Remove** → **Provision Lab**.

### Research Lab terminal won't connect or session exits

Re-provision the lab container (your home directory volume is preserved):

```bash
# Or from the UI: Scenarios → Research Lab → Remove → Provision Lab
docker compose restart backend
```

If the container keeps exiting, check logs:

```bash
docker logs cityshield-lab-<username>
```

### Docker Compose errors

```bash
# Validate config
docker compose config > /dev/null

# Clean restart (removes volumes — OpenSearch data will be lost)
docker compose down -v
docker compose up -d --build

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f detection_engine
```

## Cyber Range

The Cyber Range provides an isolated attack/defense lab within CityShield. It uses the `tleemcjr/metasploitable2` image (community mirror — the original `vulnerables/metasploitable2` is no longer available on Docker Hub).

### Components

| Container | Image | Network | IP | Role |
|---|---|---|---|---|
| `metasploitable` | `tleemcjr/metasploitable2` | `cyber_range_net` | 172.20.0.2 | Vulnerable target |
| `attacker` | Custom Kali (nmap, netcat, curl, etc.) | `cyber_range_net` | 172.20.0.3 | Attack tools |
| `range_logger` | Python + tcpdump | Both networks | 172.20.0.4 | Packet capture → JSON → Filebeat |

### How to Use

**From the UI:**
1. Log in at http://localhost:3000
2. Navigate to **Scenarios** → select **Cyber Range: Port Scan** → **Run Scenario**
3. The 3D city map shows the Metasploitable building in the Cyber Range zone (cyan) with real-time stage progress
4. View alerts and logs as the detection engine picks up events

**From the terminal (manual attack):**
```bash
docker exec -it attacker bash

# Inside the attacker container:
ping metasploitable
nmap -sV metasploitable
nc metasploitable 80
```

**View cyber range logs in OpenSearch Dashboards:**
```
http://localhost:5601 → Discover → filter: zone:"cyber-range"
```

### Pipeline

```
attacker ──nmap/ping──▶ metasploitable
    │                         │
    └──── cyber_range_net ────┘
              │
         range_logger (tcpdump)
              │
         /data/logs/cyber_range.log
              │
         Filebeat → OpenSearch logs-*
              │
         detection_engine → alerts
```

## Research Lab

The **Research Lab** (Scenarios → Research Lab tab) provisions a per-user Ubuntu container
with security tools (nmap, hydra, nikto, netcat, tcpdump, curl, wget, python3, ping, dig).
It is connected to three Docker networks: `cityshield_network`, `cyber_range_net`, and
`iot_range_net` — so it can reach both training targets directly.

### Provisioning from the UI

1. Login as a **Researcher** or **Administrator**
2. Navigate to **Scenarios** → click the **Research Lab** tab
3. Click **Provision Lab** — a personal container is created with all tools installed
4. The embedded terminal opens automatically once the container is running

### Verifying Connectivity

From the Research Lab terminal, confirm both targets are reachable:

```bash
# Cyber range target
ping -c 2 metasploitable
nmap -sT --top-ports 20 metasploitable

# IoT range target
ping -c 2 iot_target
curl http://iot_target:8080/sensors
nmap -sT -p 1883,8080 iot_target
```

### Rebuilding the Lab Image

After modifying the Dockerfile or welcome banner:

```bash
docker compose build researcher-lab-image
```

Then in the UI: Scenarios → Research Lab → **Remove** → **Provision Lab**.

## Security Considerations

- **Change Default Credentials**: Update all default passwords in `.env`
- **Network Isolation**: Services communicate on isolated Docker network
- **Secrets Management**: Never commit `.env` file to version control
- **HTTPS**: In production, use reverse proxy with TLS
- **OpenSearch Security**: Enable authentication and TLS for production deployments
- **RBAC**: Enforce least-privilege access for all users

## Performance Tuning

- **Event Rates**: Adjust `EVENT_RATE` variables for simulators in `.env`
- **Poll Intervals**: Tune detection and response poll intervals
- **OpenSearch**: Increase heap size via `OPENSEARCH_JAVA_OPTS` for large deployments
- **Log Retention**: Configure index lifecycle management for log rotation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- MITRE ATT&CK® framework for threat modeling
- OpenSearch project for search and analytics
- FastAPI and React communities

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/SamiAhmedQMUL/CityShield/issues
- Documentation: [docs/](docs/)

---

**CityShield Platform** - Securing Tomorrow's Smart Cities Today
