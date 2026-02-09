# CityShield Platform

**Simulating and Defending Smart City Cyberattacks**

CityShield is a secure, scalable, interactive smart city cyber range for training, testing, and evaluating cybersecurity defenses. It deploys modular smart-city domain microservices, simulates realistic cyber-attack scenarios, provides centralized logging and monitoring, detects threats using rule-based detection aligned to MITRE ATT&CK, integrates live threat intelligence enrichment, and executes automated response playbooks.

## Features

- **Modular Simulation Layer**: Traffic management, IoT sensors, and network emulator services that generate realistic event streams
- **Centralized Logging**: Filebeat ships logs to OpenSearch for analysis
- **Threat Detection**: Rule-based detection engine with MITRE ATT&CK mapping and threat intelligence enrichment
- **Automated Response**: Python-based response manager executes Ansible playbooks for containment actions
- **Interactive 3D City Visualization**: Real-time 3D smart city powered by Three.js / React Three Fiber with orbit controls, hover/click interactions, and live data-driven building states
- **Interactive Web UI**: React-based dashboard for monitoring, alert investigation, and scenario management
- **Role-Based Access Control**: Administrator, Analyst, and Researcher roles with appropriate permissions
- **Evaluation Metrics**: MTTD, MTTR, detection accuracy, false positive rate, and resource utilization tracking
- **Scenario Builder**: Create and run custom attack scenarios programmatically

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                         │
│  Dashboard │ Alerts │ Scenarios │ Rules │ Admin                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                Backend API (FastAPI + JWT + RBAC)                │
│  Auth │ Users │ Rules │ Scenarios │ Alerts │ Metrics            │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                Data Layer (OpenSearch + Dashboards)              │
│  logs-* │ alerts │ rules │ scenarios │ users                    │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ├──────────────────┬─────────────────┬──────────────────┐
           ▼                  ▼                 ▼                  ▼
    ┌────────────┐     ┌────────────┐    ┌──────────┐    ┌──────────────┐
    │ Detection  │     │  Response  │    │ Scenario │    │   Filebeat   │
    │  Engine    │     │  Manager   │    │  Runner  │    │ Log Shipper  │
    └────────────┘     └────────────┘    └──────────┘    └──────┬───────┘
                                                                  │
                            ┌─────────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
    ┌────────────┐   ┌────────────┐   ┌──────────────┐
    │  Traffic   │   │    IoT     │   │   Network    │
    │ Simulator  │   │ Simulator  │   │  Emulator    │
    └────────────┘   └────────────┘   └──────────────┘
```

## Prerequisites

- Docker Desktop 4.x or later
- Docker Compose 2.x or later
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/cityshield.git
cd cityshield

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

Wait for all services to become healthy (2-3 minutes). You'll see:

```
✓ opensearch        Started
✓ dashboards        Started
✓ filebeat          Started
✓ backend           Started
✓ frontend          Started
✓ traffic_sim       Started
✓ iot_sim           Started
✓ network_emulator  Started
✓ detection_engine  Started
✓ response_manager  Started
✓ scenario_runner   Started
```

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

### Running Your First Scenario

1. Login to the web UI at http://localhost:3000
2. Navigate to **Scenarios**
3. Select a built-in scenario:
   - **Traffic Network Scan**: Simulates port scanning attack
   - **IoT Anomaly Burst**: Simulates anomalous sensor behavior
4. Click **Run Scenario**
5. Navigate to **Alerts** to see detected threats
6. Navigate to **OpenSearch Dashboards** to visualize logs

### Command Line Scenario Execution

```bash
# List available scenarios
python scripts/run_scenario.py --list

# Run a scenario
python scripts/run_scenario.py traffic_scan_001 --wait
```

### Generating Labeled Dataset

```bash
# Generate labeled dataset for evaluation
python scripts/generate_dataset.py

# This will:
# 1. Run multiple scenarios
# 2. Collect logs with is_attack labels
# 3. Export to data/datasets/labeled_events.jsonl
```

### Computing Evaluation Metrics

```bash
# Compute MTTD, MTTR, accuracy, etc.
python scripts/compute_metrics.py

# Metrics include:
# - Mean Time To Detect (MTTD)
# - Mean Time To Respond (MTTR)
# - Detection accuracy and false positive rate
# - Resource utilization
# - Log ingestion rate
```

### Importing Dashboards

```bash
# Import pre-configured OpenSearch Dashboards
./scripts/import_dashboards.sh

# Access dashboards at:
# http://localhost:5601/app/dashboards
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Administrator** | Manage users, system configuration, view all resources |
| **Analyst** | View alerts and logs, investigate incidents, update alert status |
| **Researcher** | Create scenarios, manage rules, run simulations, export datasets |

## Detection Rules

CityShield includes built-in detection rules mapped to MITRE ATT&CK:

1. **Network Port Scan** (T1046): Detects scanning of multiple ports from single source
2. **IoT Sensor Anomaly** (T1565): Detects anomalous sensor readings or tampering

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
│   └── scenario_runner/  # Scenario orchestration service
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

The Overview dashboard features an interactive 3D city where each building represents a smart city component. Buildings are grouped into four zones (Traffic, IoT, Network, Security) separated by roads.

- **Building height** reflects event count (log scale)
- **Building color** reflects status: green (ok), amber (warning), red+glow (critical), gray (offline)
- **Interactions**: Orbit/pan/zoom camera, hover for tooltips, click for detail panel
- **Data source**: `GET /api/overview/city-components` (mock or live OpenSearch aggregation)

Set `USE_MOCK_CITY_COMPONENTS=true` in `.env` for deterministic demo data.

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
- GitHub Issues: https://github.com/yourusername/cityshield/issues
- Documentation: [docs/](docs/)

---

**CityShield Platform** - Securing Tomorrow's Smart Cities Today
