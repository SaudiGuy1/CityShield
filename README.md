# CityShield Platform

**Simulating and Defending Smart City Cyberattacks**

CityShield is a secure, scalable, interactive smart city cyber range for training, testing, and evaluating cybersecurity defenses. It deploys modular smart-city domain microservices, simulates realistic cyber-attack scenarios, provides centralized logging and monitoring, detects threats using rule-based detection aligned to MITRE ATT&CK, integrates live threat intelligence enrichment, and executes automated response playbooks.

## Features

- **Modular Simulation Layer**: Traffic management, IoT sensors, and network emulator services that generate realistic event streams
- **Cyber Range**: Isolated attack/defense lab with a real Metasploitable target and Kali-based attacker container, with live packet capture via `range_logger`
- **Centralized Logging**: Filebeat ships logs to OpenSearch for analysis
- **Threat Detection**: 15 rule-based detection rules with MITRE ATT&CK mapping and optional threat intelligence enrichment (AbuseIPDB)
- **Automated Response**: Python-based response manager executes Ansible playbooks for containment actions
- **Interactive 3D City Visualization**: Real-time 3D smart city powered by Three.js / React Three Fiber with 6 zones (Traffic, IoT, Network, Security, Industrial, Cyber Range), orbit controls, hover/click interactions, and live data-driven building states
- **Attack Scenario Engine**: 11 built-in scenarios with real-time stage progression, 4-stage execution per scenario, and live progress tracking in the UI
- **Interactive Web UI**: React-based dashboard for monitoring, alert investigation, and scenario management
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
```

## Prerequisites

- Docker Desktop 4.x or later
- Docker Compose 2.x or later
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/SamiAhmedQMUL/CityShield.git
cd CityShield

# Run bootstrap script
./scripts/bootstrap.sh
```

### 2. Configure Environment

```bash
# Copy and edit .env file
cp .env.example .env

# IMPORTANT: Update these values in .env:
# - BACKEND_JWT_SECRET (generate a secure random string)
# - OPENSEARCH_PASS (change default password)
# - DEFAULT_ADMIN_PASS (change default admin password)
```

### 3. Start the Platform

```bash
docker compose up --build
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

### 4. Access the Platform

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **OpenSearch Dashboards**: http://localhost:5601

**Default Login Credentials**:
- Username: `admin`
- Password: `CityShield@Admin2026`

**⚠️ IMPORTANT**: Change the default admin password immediately after first login!

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

4. Click **Run Scenario** — the 3D city map shows real-time stage progression (4 stages per scenario)
5. Navigate to **Alerts** to see detected threats
6. Navigate to **OpenSearch Dashboards** (http://localhost:5601) to query logs

## User Roles

| Role | Permissions |
|------|-------------|
| **Administrator** | Manage users, system configuration, view all resources |
| **Analyst** | View alerts and logs, investigate incidents, update alert status |
| **Researcher** | Create scenarios, manage rules, run simulations, export datasets |

## Detection Rules

CityShield includes 15 detection rules mapped to MITRE ATT&CK, including:

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
| **Cyber Range** | **Cyan** | **Metasploitable training target** |

- **Building height** reflects risk score (derived from alert count)
- **Building color** reflects status: green (ok), amber (warning), red+glow (critical), gray (offline)
- **Attack visualization**: Red pulse on targeted building, real-time stage progress bar
- **Interactions**: Orbit/pan/zoom camera, hover for tooltips, click for asset inspector panel
- **Data source**: Live WebSocket stream from `city-assets` index (2s refresh) + REST fallback

See [docs/smart-city-3d.md](docs/smart-city-3d.md) for full technical details.

### Additional Frontend Dependencies

| Package | Version | Purpose |
|---|---|---|
| `three` | ^0.160.0 | 3D rendering engine |
| `@react-three/fiber` | ^8.15.12 | React Three.js renderer |
| `@react-three/drei` | ^9.93.0 | Camera controls, helpers |
| `@react-three/postprocessing` | ^2.16.2 | Optional bloom/glow effects |
| `animejs` | ^3.2.1 | UI panel animations |

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
- [OpenSearch Integration](docs/opensearch-integration.md) - OpenSearch Dashboards deep-dive investigation

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Lint backend
ruff check app/

# Frontend tests (after frontend is built)
cd frontend
npm test
npm run lint
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

### Services Won't Start

```bash
# Check service logs
docker compose logs [service_name]

# Common issues:
# 1. Port conflicts - ensure ports 3000, 5601, 8000, 9200 are available
# 2. Insufficient memory - increase Docker memory to 8GB+
# 3. OpenSearch vm.max_map_count - run: sysctl -w vm.max_map_count=262144
```

### No Logs Appearing

```bash
# Check Filebeat status
docker compose logs filebeat

# Verify log files are being created
docker compose exec traffic_sim ls -la /data/logs/

# Check OpenSearch indices
curl -u admin:Admin@123!Change http://localhost:9200/_cat/indices
```

### No Alerts Generated

```bash
# Check detection engine logs
docker compose logs detection_engine

# Verify rules are loaded
curl -u admin:password http://localhost:8000/api/rules

# Run a scenario to generate attack traffic
python scripts/run_scenario.py traffic_scan_001 --wait
```

### Authentication Fails

```bash
# Reset admin password
docker compose exec backend python -c "
from app.core.security import get_password_hash
print(get_password_hash('NewPassword123'))
"

# Update in OpenSearch users index manually
```

## Cyber Range

The Cyber Range provides an isolated attack/defense lab within CityShield. It uses the `tleemcjr/metasploitable2` image (community mirror — the original `vulnerables/metasploitable2` is no longer available on Docker Hub).

### Components

| Container | Image | Network | Role |
|---|---|---|---|
| `metasploitable` | `tleemcjr/metasploitable2` | `cyber_range_net` (internal) | Vulnerable target |
| `attacker` | Custom Kali (nmap, netcat, curl, etc.) | `cyber_range_net` | Attack tools |
| `range_logger` | Python + tcpdump | Both networks | Packet capture → JSON → Filebeat |

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

## Research Lab → Metasploitable

The **Research Lab** (Scenarios → Research Lab tab) is the in-app attacker terminal.
It provisions a per-user Ubuntu container with security tools, connected to both
`cityshield_network` and the isolated `cyber_range_net` so it can reach Metasploitable directly.

**Rebuild the lab image** (after changing the Dockerfile or welcome banner):

```bash
docker compose build researcher-lab-image
```

**Re-provision** so the new image takes effect:

1. In the UI → Scenarios → Research Lab → **Remove** the existing lab
2. Click **Provision Lab** — the new container gets the updated banner and network connections

**Verify everything works:**

```bash
./scripts/verify_research_lab_tools_and_targets.sh
```

The script builds the image, checks all 10 required tools are installed, confirms the
welcome banner mentions Metasploitable, and tests DNS + ping + nmap connectivity.

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
